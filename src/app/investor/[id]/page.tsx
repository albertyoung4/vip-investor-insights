import fs from "fs";
import path from "path";
import Link from "next/link";
import type { InvestorProfile, OMRDeal } from "@/lib/types";
import StatCard from "@/components/StatCard";
import QuarterlyStats from "@/components/QuarterlyStats";
import PropertyTable from "@/components/PropertyTable";
import InvestorMap from "@/components/InvestorMap";
import OMRDealsTable from "@/components/OMRDealsTable";

function getDataDir() {
  const cwd = process.cwd();
  const candidate = path.join(cwd, "public", "data");
  if (fs.existsSync(candidate)) return candidate;
  const projectCandidate = path.join(cwd, "vip-investor-insights", "public", "data");
  if (fs.existsSync(projectCandidate)) return projectCandidate;
  return candidate;
}

export function generateStaticParams() {
  const investorDir = path.join(getDataDir(), "investors");
  if (!fs.existsSync(investorDir)) return [];
  return fs.readdirSync(investorDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ id: f.replace(".json", "") }));
}

export default async function InvestorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const filePath = path.join(getDataDir(), "investors", `${id}.json`);

  if (!fs.existsSync(filePath)) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-emerald-600 hover:text-emerald-800 text-sm"
        >
          &larr; Back to dashboard
        </Link>
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-yellow-800">
          <p className="font-medium">Investor not found</p>
        </div>
      </main>
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const profile: InvestorProfile = JSON.parse(raw);
  const { investor: inv, stats, properties } = profile;

  // Load MLS classification data
  const mlsCsvPath = path.join(getDataDir(), "mls-check-results.csv");
  const mlsInfo: Record<string, { category: string; exitStrategy: string }> = {};
  if (fs.existsSync(mlsCsvPath)) {
    const mlsLines = fs.readFileSync(mlsCsvPath, "utf-8").trim().split("\n").slice(1);
    for (const line of mlsLines) {
      const parts = line.split(",");
      mlsInfo[parts[0]] = { category: parts[4] || "Off Market", exitStrategy: parts[5] || "" };
    }
  }

  // Load OMR deals for this investor
  const omrPath = path.join(getDataDir(), "omr-matches.json");
  let omrDeals: OMRDeal[] = [];
  if (fs.existsSync(omrPath)) {
    const omrData = JSON.parse(fs.readFileSync(omrPath, "utf-8"));
    omrDeals = omrData.investors?.[id] || [];
  }

  const rebuiltShare =
    stats.rebuiltTransactions + stats.recorderTransactions > 0
      ? Math.round(
          (stats.rebuiltTransactions /
            (stats.rebuiltTransactions + stats.recorderTransactions)) *
            100
        )
      : 0;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="text-emerald-600 hover:text-emerald-800 text-sm"
      >
        &larr; Back to dashboard
      </Link>

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{inv.name}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500 mt-1">
          <span>{inv.email}</span>
          {inv.phone && <span>{inv.phone}</span>}
        </div>
        {inv.entities.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {inv.entities.map((e) => (
              <span
                key={e}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
              >
                {e}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Won" value={inv.totalWon} />
        <StatCard label="Total Bids" value={inv.totalBids} />
        <StatCard label="YTD Won" value={inv.ytdWon} />
        <StatCard label="YTD Bids" value={inv.ytdBids} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="2025 Transactions"
          value={stats.totalTransactions2025}
        />
        <StatCard label="Via Rebuilt" value={stats.rebuiltTransactions} />
        <StatCard label="Via Recorder" value={stats.recorderTransactions} />
        <StatCard
          label="Rebuilt Share"
          value={`${rebuiltShare}%`}
          sub="of known transactions"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <QuarterlyStats data={stats.quarterlyStats} />
        <InvestorMap properties={properties} />
      </div>

      <PropertyTable properties={properties} mlsInfo={mlsInfo} />

      {omrDeals.length > 0 && (
        <div className="mt-6">
          <OMRDealsTable deals={omrDeals} />
        </div>
      )}
    </main>
  );
}
