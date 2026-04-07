"use client";

import { useState, useMemo } from "react";
import type { OMRDeal } from "@/lib/types";

type SortKey = "postedAt" | "askingPrice" | "distanceMiles" | "city";

export default function OMRDealsTable({ deals }: { deals: OMRDeal[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("postedAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return deals;
    const q = search.toLowerCase();
    return deals.filter(
      (d) =>
        d.city.toLowerCase().includes(q) ||
        d.address.toLowerCase().includes(q) ||
        d.posterName.toLowerCase().includes(q)
    );
  }, [deals, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "postedAt") {
        cmp = new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime();
      } else if (sortKey === "askingPrice") {
        cmp = (a.askingPrice || 0) - (b.askingPrice || 0);
      } else if (sortKey === "distanceMiles") {
        cmp = a.distanceMiles - b.distanceMiles;
      } else if (sortKey === "city") {
        cmp = a.city.localeCompare(b.city);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "city");
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  function formatPrice(val: number | null) {
    if (!val) return "—";
    return `$${val.toLocaleString()}`;
  }

  function formatDate(iso: string) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-900">
            Off-Market Radar Opportunities ({filtered.length})
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            OMR deals posted within 10 miles of this investor&apos;s purchase locations
          </p>
        </div>
        <input
          type="text"
          placeholder="Filter by city, address, poster..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-50 text-left text-gray-500">
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => toggleSort("postedAt")}
              >
                Posted{arrow("postedAt")}
              </th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => toggleSort("city")}
              >
                Location{arrow("city")}
              </th>
              <th className="px-3 py-2">Address</th>
              <th
                className="px-3 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("askingPrice")}
              >
                Ask{arrow("askingPrice")}
              </th>
              <th className="px-3 py-2 text-right">ARV</th>
              <th className="px-3 py-2 text-center">Bed/Bath</th>
              <th className="px-3 py-2 text-right">Sqft</th>
              <th
                className="px-3 py-2 text-right cursor-pointer"
                onClick={() => toggleSort("distanceMiles")}
              >
                Dist{arrow("distanceMiles")}
              </th>
              <th className="px-3 py-2">Wholesaler</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((deal) => (
              <tr
                key={deal.id}
                className="border-t border-gray-100 hover:bg-orange-50/50"
              >
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                  {formatDate(deal.postedAt)}
                </td>
                <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                  {deal.city}, {deal.state}
                </td>
                <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">
                  {deal.address || <span className="text-gray-300 italic">unparsed</span>}
                </td>
                <td className="px-3 py-2 text-right font-medium text-orange-600 whitespace-nowrap">
                  {formatPrice(deal.askingPrice)}
                </td>
                <td className="px-3 py-2 text-right text-gray-500 whitespace-nowrap">
                  {formatPrice(deal.arv)}
                </td>
                <td className="px-3 py-2 text-center text-gray-500">
                  {deal.beds || "—"}/{deal.baths || "—"}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {deal.sqft ? deal.sqft.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                    deal.distanceMiles <= 3
                      ? "bg-emerald-100 text-emerald-700"
                      : deal.distanceMiles <= 7
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {deal.distanceMiles} mi
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500 max-w-[140px] truncate">
                  {deal.posterName}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                  No off-market deals found within 10 miles of this investor&apos;s locations
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
