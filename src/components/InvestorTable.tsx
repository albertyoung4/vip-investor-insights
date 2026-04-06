"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { VIPInvestor } from "@/lib/types";

type SortKey = "name" | "totalWon" | "totalBids" | "ytdWon" | "ytdBids";

export default function InvestorTable({
  investors,
}: {
  investors: VIPInvestor[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("totalWon");
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
      } else {
        cmp = a[sortKey] - b[sortKey];
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

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
                className="px-4 py-2 cursor-pointer"
                onClick={() => toggleSort("name")}
              >
                Name{arrow("name")}
              </th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Entities</th>
              <th
                className="px-4 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("totalWon")}
              >
                Won{arrow("totalWon")}
              </th>
              <th
                className="px-4 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("totalBids")}
              >
                Bids{arrow("totalBids")}
              </th>
              <th
                className="px-4 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("ytdWon")}
              >
                YTD Won{arrow("ytdWon")}
              </th>
              <th
                className="px-4 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("ytdBids")}
              >
                YTD Bids{arrow("ytdBids")}
              </th>
              <th className="px-4 py-2 text-right">Win %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((inv) => {
              const winPct =
                inv.totalBids > 0
                  ? Math.round((inv.totalWon / inv.totalBids) * 100)
                  : 0;
              return (
                <tr
                  key={inv.id}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/investor/${inv.id}`}
                      className="text-emerald-600 hover:text-emerald-800 font-medium"
                    >
                      {inv.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-xs">
                    {inv.email}
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs max-w-[200px] truncate">
                    {inv.entities.length > 0
                      ? inv.entities.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-gray-900">
                    {inv.totalWon}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {inv.totalBids}
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-emerald-600">
                    {inv.ytdWon}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {inv.ytdBids}
                  </td>
                  <td className="px-4 py-2 text-right">
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
