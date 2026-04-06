import type { QuarterlyStats as QStats } from "@/lib/types";

const QUARTERS = ["2025-Q1", "2025-Q2", "2025-Q3", "2025-Q4", "2026-Q1"];

export default function QuarterlyStats({ data }: { data: QStats }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Quarterly Breakdown</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-gray-500">
            <th className="px-4 py-2">Quarter</th>
            <th className="px-4 py-2 text-right">Rebuilt</th>
            <th className="px-4 py-2 text-right">Other</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2 text-right">Rebuilt %</th>
          </tr>
        </thead>
        <tbody>
          {QUARTERS.map((q) => {
            const s = data[q] || { rebuilt: 0, total: 0 };
            const other = s.total - s.rebuilt;
            const pct = s.total > 0 ? Math.round((s.rebuilt / s.total) * 100) : 0;
            return (
              <tr key={q} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-900">{q}</td>
                <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                  {s.rebuilt}
                </td>
                <td className="px-4 py-2 text-right text-orange-500 font-medium">
                  {other}
                </td>
                <td className="px-4 py-2 text-right text-gray-900 font-medium">
                  {s.total}
                </td>
                <td className="px-4 py-2 text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      pct >= 50
                        ? "bg-emerald-100 text-emerald-700"
                        : pct > 0
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {pct}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
