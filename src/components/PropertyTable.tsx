"use client";

import { useState } from "react";
import type { PropertyDetail } from "@/lib/types";

type SortKey = "offerDate" | "offerPrice" | "city" | "state" | "isRebuilt";

export default function PropertyTable({
  properties,
  mlsInfo,
}: {
  properties: PropertyDetail[];
  mlsInfo?: Record<string, { category: string; exitStrategy: string }>;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("offerDate");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...properties].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "offerDate") {
      cmp = new Date(a.offerDate).getTime() - new Date(b.offerDate).getTime();
    } else if (sortKey === "offerPrice") {
      cmp = a.offerPrice - b.offerPrice;
    } else if (sortKey === "isRebuilt") {
      cmp = (a.isRebuilt ? 1 : 0) - (b.isRebuilt ? 1 : 0);
    } else {
      cmp = (a[sortKey] || "").localeCompare(b[sortKey] || "");
    }
    return sortAsc ? cmp : -cmp;
  });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(key === "city" || key === "state");
    }
  }

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " \u2191" : " \u2193") : "";

  function getSource(p: PropertyDetail): { label: string; className: string } {
    if (p.isRebuilt) {
      return { label: "Rebuilt", className: "bg-emerald-100 text-emerald-700" };
    }
    const addr = (p.address || "").replace(/,\s*/g, " ").toUpperCase().trim();
    const info = mlsInfo?.[addr];
    if (info?.category === "MLS" || info?.category === "REO") {
      return { label: info.category === "REO" ? "REO" : "MLS", className: "bg-blue-100 text-blue-700" };
    }
    return { label: "3rd Party", className: "bg-orange-100 text-orange-700" };
  }

  function getExitStrategy(p: PropertyDetail): string | null {
    if (p.isRebuilt) return null;
    const addr = (p.address || "").replace(/,\s*/g, " ").toUpperCase().trim();
    const info = mlsInfo?.[addr];
    return info?.exitStrategy || null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">
          Properties ({properties.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500">
              <th
                className="px-3 py-2 cursor-pointer whitespace-nowrap"
                onClick={() => toggleSort("offerDate")}
              >
                Date{arrow("offerDate")}
              </th>
              <th className="px-3 py-2">Address</th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => toggleSort("city")}
              >
                City{arrow("city")}
              </th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => toggleSort("state")}
              >
                St{arrow("state")}
              </th>
              <th className="px-3 py-2 text-right">Beds</th>
              <th className="px-3 py-2 text-right">Baths</th>
              <th className="px-3 py-2 text-right">Sqft</th>
              <th className="px-3 py-2 text-right">Lot</th>
              <th
                className="px-3 py-2 text-right cursor-pointer whitespace-nowrap"
                onClick={() => toggleSort("offerPrice")}
              >
                Price{arrow("offerPrice")}
              </th>
              <th
                className="px-3 py-2 cursor-pointer"
                onClick={() => toggleSort("isRebuilt")}
              >
                Source{arrow("isRebuilt")}
              </th>
              <th className="px-3 py-2">Exit</th>
              <th className="px-3 py-2">OMR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, i) => {
              const source = getSource(p);
              const exit = getExitStrategy(p);
              return (
                <tr
                  key={`${p.attomId}-${i}`}
                  className="border-t border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {p.offerDate ? new Date(p.offerDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-900 max-w-[250px] truncate">
                    {p.address || "—"}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{p.city || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{p.state || "—"}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {p.beds ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {p.baths ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {p.sqft ? p.sqft.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {p.lotSize ? p.lotSize.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-900 font-medium">
                    {p.offerPrice
                      ? "$" + p.offerPrice.toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${source.className}`}
                    >
                      {source.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {exit ? (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        {exit}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {p.omrMatch ? (
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 cursor-help"
                        title={`Posted by ${p.omrMatch.posterName || "unknown"}${p.omrMatch.askingPrice ? ` — asking $${p.omrMatch.askingPrice.toLocaleString()}` : ""}`}
                      >
                        FB Deal
                      </span>
                    ) : null}
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
