import fs from "fs";
import path from "path";
import type { InvestorsData } from "@/lib/types";
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
  const filePath = path.join(getDataDir(), "investors.json");

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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="VIP Investors" value={totalInvestors} />
        <StatCard label="Total Properties Won" value={totalWon} />
        <StatCard
          label="Active YTD"
          value={activeYTD}
          sub={totalInvestors > 0 ? `${Math.round((activeYTD / totalInvestors) * 100)}% of VIPs` : undefined}
        />
      </div>

      <InvestorTable investors={data.investors} />
    </main>
  );
}
