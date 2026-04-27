"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { VIPInvestor, PurchaseBreakdown, CommissionData } from "@/lib/types";

type SortKey = "name" | "totalWon" | "totalBids" | "ytdWon" | "ytdBids" | "total2025" | "total2026" | "mlsRate" | "estCommission";

export default function InvestorTable({
  investors,
  breakdowns,
  commissions,
}: {
  investors: VIPInvestor[];
  breakdowns?: Record<string, PurchaseBreakdown>;
  commissions?: Record<string, CommissionData>;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total2025");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return investors.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        inv.email.toLowerCase().includes(q) ||
        inv.entities.some((e) => e.toLowerCase().includes(q))
    );
  }, [investors, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortKey === "total2025") {
        const ba = breakdowns?.[a.id];
        const bb = breakdowns?.[b.id];
        cmp = ((ba?.mls2025||0)+(ba?.offMarket2025||0)+(ba?.rebuilt2025||0)) - ((bb?.mls2025||0)+(bb?.offMarket2025||0)+(bb?.rebuilt2025||0));
      } else if (sortKey === "total2026") {
        const ba = breakdowns?.[a.id];
        const bb = breakdowns?.[b.id];
        cmp = ((ba?.mls2026||0)+(ba?.offMarket2026||0)+(ba?.rebuilt2026||0)) - ((bb?.mls2026||0)+(bb?.offMarket2026||0)+(bb?.rebuilt2026||0));
      } else if (sortKey === "mlsRate") {
        cmp = (commissions?.[a.id]?.mlsRate || 0) - (commissions?.[b.id]?.mlsRate || 0);
      } else if (sortKey === "estCommission") {
        cmp = (commissions?.[a.id]?.estCommission3pct || 0) - (commissions?.[b.id]?.estCommission3pct || 0);
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc, breakdowns]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
        <h2 className="font-semibold text-gray-900">
          VIP Investors ({filtered.length})
        </h2>
        <input
          type="text"
          placeholder="Search name, email, or entity..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-72 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => toggleSort("name")}
              >
                Name{arrow("name")}
              </th>
              <th className="px-3 py-2">Entities</th>
              <th
                className="px-3 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("totalWon")}
              >
                Won{arrow("totalWon")}
              </th>
              <th
                className="px-3 py-2 text-center cursor-pointer border-l border-gray-200"
                onClick={() => toggleSort("total2025")}
                colSpan={3}
              >
                2025 Purchased{arrow("total2025")}
              </th>
              <th
                className="px-3 py-2 text-center cursor-pointer border-l border-gray-200"
                onClick={() => toggleSort("total2026")}
                colSpan={3}
              >
                2026 YTD{arrow("total2026")}
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer border-l border-gray-200"
                onClick={() => toggleSort("mlsRate")}
              >
                %MLS{arrow("mlsRate")}
              </th>
              <th
                className="px-3 py-2 text-right cursor-pointer border-l border-gray-200"
                onClick={() => toggleSort("estCommission")}
              >
                Est. Commission{arrow("estCommission")}
              </th>
              <th className="px-3 py-2 text-center border-l border-gray-200">Opp.</th>
              <th className="px-3 py-2 text-right border-l border-gray-200">Win %</th>
            </tr>
            <tr className="bg-gray-50 text-left text-gray-400 text-xs">
              <th className="px-3 pb-1"></th>
              <th className="px-3 pb-1"></th>
              <th className="px-3 pb-1"></th>
              <th className="px-3 pb-1 text-center border-l border-gray-200 text-blue-500">MLS</th>
              <th className="px-3 pb-1 text-center text-orange-500">3rd Pty</th>
              <th className="px-3 pb-1 text-center text-emerald-500">Rebuilt</th>
              <th className="px-3 pb-1 text-center border-l border-gray-200 text-blue-500">MLS</th>
              <th className="px-3 pb-1 text-center text-orange-500">3rd Pty</th>
              <th className="px-3 pb-1 text-center text-emerald-500">Rebuilt</th>
              <th className="px-3 pb-1 border-l border-gray-200"></th>
              <th className="px-3 pb-1 border-l border-gray-200 text-center text-gray-400">@3%</th>
              <th className="px-3 pb-1 border-l border-gray-200"></th>
              <th className="px-3 pb-1 border-l border-gray-200"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => {
              const winPct =
                inv.totalBids > 0
                  ? Math.round((inv.totalWon / inv.totalBids) * 100)
                  : 0;
              const bd = breakdowns?.[inv.id];
              const cd = commissions?.[inv.id];
              return (
                <tr
                  key={inv.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/investor/${inv.id}`}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      {inv.name}
                    </Link>
                    <div className="text-xs text-gray-400">{inv.email}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs max-w-[180px] truncate">
                    {inv.entities.length > 0
                      ? inv.entities.join(", ")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                    {inv.totalWon}
                  </td>
                  <td className="px-3 py-2 text-center border-l border-gray-100 font-medium text-blue-600">
                    {bd?.mls2025 || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-orange-600">
                    {bd?.offMarket2025 || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-emerald-600">
                    {bd?.rebuilt2025 || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center border-l border-gray-100 font-medium text-blue-600">
                    {bd?.mls2026 || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-orange-600">
                    {bd?.offMarket2026 || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-center font-medium text-emerald-600">
                    {bd?.rebuilt2026 || <span className="text-gray-300">0</span>}
                  </td>
                  <td className="px-3 py-2 text-right border-l border-gray-100 font-medium">
                    {cd ? (
                      <span className={cd.mlsRate >= 0.5 ? "text-blue-600" : cd.mlsRate >= 0.2 ? "text-gray-700" : "text-gray-400"}>
                        {Math.round(cd.mlsRate * 100)}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right border-l border-gray-100 font-medium text-gray-900">
                    {cd && cd.estCommission3pct > 0 ? (
                      `$${Math.round(cd.estCommission3pct).toLocaleString()}`
                    ) : <span className="text-gray-300">$0</span>}
                  </td>
                  <td className="px-3 py-2 text-center border-l border-gray-100">
                    {cd ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        cd.opportunityType === "MLS-Heavy"
                          ? "bg-blue-100 text-blue-700"
                          : cd.opportunityType === "Off-Market"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {cd.opportunityType}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right border-l border-gray-100">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        winPct >= 50
                          ? "bg-emerald-100 text-emerald-700"
                          : winPct >= 25
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {winPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
