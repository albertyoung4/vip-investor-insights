const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load .env from project root
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match && !process.env[match[1].trim()]) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

if (!process.env.DB_HOST || !process.env.DB_PASSWORD || !process.env.MARKETPLACE_DBLINK) {
  console.error("Required env vars: DB_HOST, DB_PASSWORD, MARKETPLACE_DBLINK");
  console.error("See .env.example for details.");
  process.exit(1);
}

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "rebuilt_prod",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  statement_timeout: 120000,
  ssl: { rejectUnauthorized: false },
};

const MARKETPLACE_DBLINK = process.env.MARKETPLACE_DBLINK;

const OUTPUT_DIR = path.join(__dirname, "..", "public", "data");

async function geocode(address) {
  try {
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
    );
    const data = await res.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      return { lat, lng };
    }
  } catch (e) {}
  return null;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log("Connected to database");

  // Step 1: Get VIP investors (3+ wins)
  console.log("Fetching VIP investors...");
  const investorResult = await client.query(`
    WITH entities AS (
      SELECT user_id, full_name, type FROM dblink(
        '${MARKETPLACE_DBLINK}',
        'SELECT user_id, full_name, type FROM entities_users'
      ) AS t(user_id uuid, full_name text, type text)
    ),
    entity_agg AS (
      SELECT user_id, string_agg(DISTINCT full_name, ' | ' ORDER BY full_name) AS entities_used
      FROM entities GROUP BY user_id
    ),
    buyers AS (
      SELECT
        u.id AS user_id,
        u.first_name || ' ' || u.surname AS name,
        u.email,
        u.phone_number,
        count(*) AS total_bids,
        count(*) FILTER (WHERE o.status IN ('accepted','done')) AS total_won,
        count(*) FILTER (WHERE o.inserted_at >= '2026-01-01') AS ytd_bids,
        count(*) FILTER (WHERE o.status IN ('accepted','done') AND o.inserted_at >= '2026-01-01') AS ytd_won
      FROM mktplace.offers o
      JOIN mktplace.users u ON u.id = o.offeror_id
      WHERE lower(split_part(u.email, '@', 2)) NOT IN (
        'rebuilt.com', 'newwestern.com', 'spartaninvest.com', 'castlerockreo.com'
      )
      GROUP BY u.id, u.first_name, u.surname, u.email, u.phone_number
      HAVING count(*) FILTER (WHERE o.status IN ('accepted','done')) >= 3
    )
    SELECT b.user_id, b.name, b.email, b.phone_number, b.total_won, b.total_bids,
           b.ytd_won, b.ytd_bids, coalesce(ea.entities_used, '') AS entities
    FROM buyers b
    LEFT JOIN entity_agg ea ON ea.user_id = b.user_id
    ORDER BY b.total_won DESC, b.total_bids DESC
  `);

  const investors = investorResult.rows.map((r) => ({
    id: r.user_id,
    name: r.name,
    email: r.email,
    phone: r.phone_number || "",
    totalWon: parseInt(r.total_won),
    totalBids: parseInt(r.total_bids),
    ytdWon: parseInt(r.ytd_won),
    ytdBids: parseInt(r.ytd_bids),
    entities: r.entities
      ? r.entities.split(" | ").filter((e) => e.trim())
      : [],
  }));

  console.log(`Found ${investors.length} VIP investors`);

  // Write main investors list
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "investors.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), investors }, null, 2)
  );

  // Step 2: For each investor, get detail data
  for (let i = 0; i < investors.length; i++) {
    const inv = investors[i];
    console.log(`[${i + 1}/${investors.length}] Processing ${inv.name}...`);

    // Get won properties with details
    let properties = [];
    try {
      const propsResult = await client.query(
        `
        SELECT
          o.property_id,
          o.inserted_at::date AS offer_date,
          o.price AS offer_price,
          o.status,
          ri.attom_id
        FROM mktplace.offers o
        LEFT JOIN mktplace.ranked_investors ri ON ri.property_id = o.property_id
        WHERE o.offeror_id = $1
          AND o.status IN ('accepted','done')
        ORDER BY o.inserted_at
      `,
        [inv.id]
      );

      for (const prop of propsResult.rows) {
        const detail = {
          propertyId: prop.property_id,
          attomId: prop.attom_id ? parseInt(prop.attom_id) : null,
          offerDate: prop.offer_date,
          offerPrice: parseFloat(prop.offer_price) || 0,
          status: prop.status,
          isRebuilt: true,
          address: null,
          city: null,
          state: null,
          beds: null,
          baths: null,
          sqft: null,
          lotSize: null,
          lat: null,
          lng: null,
        };

        // Try to get property details from recorder using attom_id
        if (detail.attomId) {
          try {
            const recResult = await client.query(
              `
              SELECT propertyaddressfull, propertyaddresscity, propertyaddressstate,
                     grantee1namefull, recordingdate, transferamount
              FROM raw.recorder
              WHERE attom_id = $1
              ORDER BY recordingdate DESC
              LIMIT 1
            `,
              [detail.attomId]
            );
            if (recResult.rows.length > 0) {
              const rec = recResult.rows[0];
              detail.address =
                rec.propertyaddressfull +
                ", " +
                rec.propertyaddresscity +
                " " +
                rec.propertyaddressstate;
              detail.city = rec.propertyaddresscity;
              detail.state = rec.propertyaddressstate;
            }
          } catch (e) {}

          // Get property details from salmar.ranked_investor_list (has address info)
          try {
            const rilResult = await client.query(
              `
              SELECT full_address, city, state
              FROM salmar.ranked_investor_list
              WHERE attom_id = $1
              LIMIT 1
            `,
              [detail.attomId]
            );
            if (rilResult.rows.length > 0) {
              const ril = rilResult.rows[0];
              if (!detail.address) {
                detail.address = ril.full_address;
                detail.city = ril.city;
                detail.state = ril.state;
              }
            }
          } catch (e) {}

          // Get beds/baths/sqft/lot from dbo.property_registry via attom_id
          try {
            const prResult = await client.query(
              `
              SELECT bedrooms_count, bath_count, area_building, lot_size_acres
              FROM dbo.property_registry
              WHERE attom_id = $1
              LIMIT 1
            `,
              [detail.attomId]
            );
            if (prResult.rows.length > 0) {
              const pr = prResult.rows[0];
              detail.beds = pr.bedrooms_count ? parseInt(pr.bedrooms_count) : null;
              detail.baths = pr.bath_count ? parseFloat(pr.bath_count) : null;
              detail.sqft = pr.area_building ? parseInt(pr.area_building) : null;
              detail.lotSize = pr.lot_size_acres ? parseFloat(pr.lot_size_acres) : null;
            }
          } catch (e) {}
        }

        properties.push(detail);
      }
    } catch (e) {
      console.error(`  Error getting properties: ${e.message}`);
    }

    // Get recorder transactions for entity names (non-rebuilt)
    let recorderTransactions = [];
    const entityNames = inv.entities
      .filter(
        (e) =>
          e.toLowerCase().includes("llc") ||
          e.toLowerCase().includes("inc") ||
          e.toLowerCase().includes("trust") ||
          e.toLowerCase().includes("llp") ||
          e.toLowerCase().includes("holdings") ||
          e.toLowerCase().includes("properties") ||
          e.toLowerCase().includes("investments") ||
          e.toLowerCase().includes("capital") ||
          e.toLowerCase().includes("fund")
      )
      .map((e) => e.toUpperCase());

    if (entityNames.length > 0) {
      for (const entityName of entityNames) {
        try {
          const recResult = await client.query(
            `
            SELECT propertyaddressfull, propertyaddresscity, propertyaddressstate,
                   recordingdate, transferamount, grantee1namefull, attom_id
            FROM raw.recorder
            WHERE grantee1namefull = $1
              AND recordingdate >= '2025-01-01'
            ORDER BY recordingdate DESC
          `,
            [entityName]
          );
          for (const rec of recResult.rows) {
            // Skip if this is a Rebuilt transaction we already have
            const isAlreadyCaptured = properties.some(
              (p) => p.attomId && p.attomId === parseInt(rec.attom_id)
            );
            if (!isAlreadyCaptured) {
              const txn = {
                propertyId: null,
                attomId: rec.attom_id ? parseInt(rec.attom_id) : null,
                offerDate: rec.recordingdate,
                offerPrice: parseFloat(rec.transferamount) || 0,
                status: "recorded",
                isRebuilt: false,
                address:
                  rec.propertyaddressfull +
                  ", " +
                  rec.propertyaddresscity +
                  " " +
                  rec.propertyaddressstate,
                city: rec.propertyaddresscity,
                state: rec.propertyaddressstate,
                beds: null,
                baths: null,
                sqft: null,
                lotSize: null,
                lat: null,
                lng: null,
                entity: rec.grantee1namefull,
              };
              // Get beds/baths/sqft for recorder transactions too
              if (txn.attomId) {
                try {
                  const prResult = await client.query(
                    `SELECT bedrooms_count, bath_count, area_building, lot_size_acres
                     FROM dbo.property_registry WHERE attom_id = $1 LIMIT 1`,
                    [txn.attomId]
                  );
                  if (prResult.rows.length > 0) {
                    const pr = prResult.rows[0];
                    txn.beds = pr.bedrooms_count ? parseInt(pr.bedrooms_count) : null;
                    txn.baths = pr.bath_count ? parseFloat(pr.bath_count) : null;
                    txn.sqft = pr.area_building ? parseInt(pr.area_building) : null;
                    txn.lotSize = pr.lot_size_acres ? parseFloat(pr.lot_size_acres) : null;
                  }
                } catch (e) {}
              }
              recorderTransactions.push(txn);
            }
          }
        } catch (e) {
          console.error(
            `  Error querying recorder for ${entityName}: ${e.message}`
          );
        }
      }
    }

    // Geocode all properties
    const allProps = [...properties, ...recorderTransactions];
    let geocoded = 0;
    for (const prop of allProps) {
      if (prop.address) {
        const coords = await geocode(prop.address);
        if (coords) {
          prop.lat = coords.lat;
          prop.lng = coords.lng;
          geocoded++;
        }
        await sleep(200);
      }
    }
    console.log(`  Geocoded ${geocoded}/${allProps.length} properties`);

    // Calculate quarterly stats
    const quarterlyStats = {
      "2025-Q1": { rebuilt: 0, total: 0 },
      "2025-Q2": { rebuilt: 0, total: 0 },
      "2025-Q3": { rebuilt: 0, total: 0 },
      "2025-Q4": { rebuilt: 0, total: 0 },
      "2026-Q1": { rebuilt: 0, total: 0 },
    };

    for (const prop of allProps) {
      const date = new Date(prop.offerDate);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      let qKey = null;
      if (year === 2025) {
        if (month <= 3) qKey = "2025-Q1";
        else if (month <= 6) qKey = "2025-Q2";
        else if (month <= 9) qKey = "2025-Q3";
        else qKey = "2025-Q4";
      } else if (year === 2026 && month <= 3) {
        qKey = "2026-Q1";
      }
      if (qKey && quarterlyStats[qKey]) {
        quarterlyStats[qKey].total++;
        if (prop.isRebuilt) quarterlyStats[qKey].rebuilt++;
      }
    }

    const profile = {
      investor: inv,
      stats: {
        totalTransactions2025: allProps.filter((p) => {
          const d = new Date(p.offerDate);
          return d.getFullYear() === 2025;
        }).length,
        rebuiltTransactions: properties.length,
        recorderTransactions: recorderTransactions.length,
        quarterlyStats,
      },
      properties: allProps,
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "investors", `${inv.id}.json`),
      JSON.stringify(profile, null, 2)
    );
  }

  await client.end();
  console.log("Done! Data extracted to public/data/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
