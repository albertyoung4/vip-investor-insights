import fs from "fs";
import path from "path";
import type { InvestorsData, InvestorProfile, PurchaseBreakdown, CommissionFile, CommissionData } from "@/lib/types";
import InvestorTable from "@/components/InvestorTable";
import StatCard from "@/components/StatCard";

export const metadata = {
  title: "VIP Investor Insights",
  description: "Dashboard for VIP investors with 3+ properties won",
};

function getDataDir() {
  // process.cwd() may not be the project root when launched from parent dir
  const cwd = process.cwd();
  const candidate = path.join(cwd, "public", "data");
  if (fs.existsSync(candidate)) return candidate;
  const projectCandidate = path.join(cwd, "vip-investor-insights", "public", "data");
  if (fs.existsSync(projectCandidate)) return projectCandidate;
  return candidate;
}

export default function Home() {
  const dataDir = getDataDir();
  const filePath = path.join(dataDir, "investors.json");

  if (!fs.existsSync(filePath)) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          VIP Investor Insights
        </h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
          <p className="font-medium">No data available</p>
          <p className="text-sm mt-1">
            Run <code className="bg-yellow-100 px-1 rounded">node scripts/extract-data.js</code> to
            generate investor data.
          </p>
        </div>
      </main>
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data: InvestorsData = JSON.parse(raw);

  // Load MLS check results CSV for classification
  const mlsCsvPath = path.join(dataDir, "mls-check-results.csv");
  const mlsMap: Record<string, string> = {};
  if (fs.existsSync(mlsCsvPath)) {
    const mlsLines = fs.readFileSync(mlsCsvPath, "utf-8").trim().split("\n").slice(1);
    for (const line of mlsLines) {
      const parts = line.split(",");
      const addr = parts[0];
      const category = parts[4] || "Off Market";
      mlsMap[addr] = category;
    }
  }

  // Compute purchase breakdown per investor from their JSON files
  const investorDir = path.join(dataDir, "investors");
  const breakdowns: Record<string, PurchaseBreakdown> = {};
  for (const inv of data.investors) {
    const invFile = path.join(investorDir, `${inv.id}.json`);
    const bd: PurchaseBreakdown = { mls2025: 0, offMarket2025: 0, rebuilt2025: 0, mls2026: 0, offMarket2026: 0, rebuilt2026: 0 };
    if (fs.existsSync(invFile)) {
      const profile: InvestorProfile = JSON.parse(fs.readFileSync(invFile, "utf-8"));
      for (const prop of profile.properties) {
        const year = prop.offerDate ? new Date(prop.offerDate).getFullYear() : 0;
        if (year !== 2025 && year !== 2026) continue;
        const suffix = year === 2025 ? "2025" : "2026";
        if (prop.isRebuilt) {
          bd[`rebuilt${suffix}` as keyof PurchaseBreakdown]++;
        } else {
          const addr = (prop.address || "").replace(/,\s*/g, " ").toUpperCase().trim();
          const cat = mlsMap[addr] || "Off Market";
          if (cat === "MLS" || cat === "REO") {
            bd[`mls${suffix}` as keyof PurchaseBreakdown]++;
          } else {
            bd[`offMarket${suffix}` as keyof PurchaseBreakdown]++;
          }
        }
      }
    }
    breakdowns[inv.id] = bd;
  }

  // Load commission data
  const commissionPath = path.join(dataDir, "commission-2025.json");
  let commissionMap: Record<string, CommissionData> = {};
  let commissionTotals = { totalDeals: 0, mlsDeals: 0, recorderVolume: 0, estMlsVolume: 0, estCommission: 0 };
  if (fs.existsSync(commissionPath)) {
    const commissionFile: CommissionFile = JSON.parse(fs.readFileSync(commissionPath, "utf-8"));
    commissionMap = commissionFile.investors;
    commissionTotals = commissionFile.totals;
  }

  const totalInvestors = data.investors.length;
  const totalWon = data.investors.reduce((s, i) => s + i.totalWon, 0);
  const activeYTD = data.investors.filter((i) => i.ytdWon > 0).length;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          VIP Investor Insights
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Investors with 3+ properties won &middot; Updated{" "}
          {new Date(data.generatedAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <StatCard label="VIP Investors" value={totalInvestors} />
        <StatCard label="Total Properties Won" value={totalWon} />
        <StatCard
          label="Active YTD"
          value={activeYTD}
          sub={totalInvestors > 0 ? `${Math.round((activeYTD / totalInvestors) * 100)}% of VIPs` : undefined}
        />
        <StatCard label="2025 MLS Deals" value={commissionTotals.mlsDeals} sub={`of ${commissionTotals.totalDeals} total`} />
        <StatCard label="2025 MLS Volume" value={`$${(commissionTotals.estMlsVolume / 1e6).toFixed(1)}M`} sub={`$${(commissionTotals.recorderVolume / 1e6).toFixed(1)}M total`} />
        <StatCard label="Est. Commission @3%" value={`$${Math.round(commissionTotals.estCommission).toLocaleString()}`} sub="buyer agent revenue" />
      </div>

      <InvestorTable investors={data.investors} breakdowns={breakdowns} commissions={commissionMap} />
    </main>
  );
}
