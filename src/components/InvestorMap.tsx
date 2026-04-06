"use client";

import { useEffect, useState } from "react";
import type { PropertyDetail } from "@/lib/types";

export default function InvestorMap({
  properties,
}: {
  properties: PropertyDetail[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load Leaflet CSS dynamically to avoid Turbopack issues
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-[400px] flex items-center justify-center text-gray-400">
        Loading map...
      </div>
    );
  }

  return <MapInner properties={properties} />;
}

function MapInner({ properties }: { properties: PropertyDetail[] }) {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const L = require("leaflet");
  const { MapContainer, TileLayer, CircleMarker, Popup } = require("react-leaflet");

  const geoProps = properties.filter((p) => p.lat && p.lng);

  if (geoProps.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 h-[400px] flex items-center justify-center text-gray-400">
        No geocoded properties to display
      </div>
    );
  }

  const lats = geoProps.map((p) => p.lat!);
  const lngs = geoProps.map((p) => p.lng!);
  const bounds = L.latLngBounds(
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-4">
        <h3 className="font-semibold text-gray-900">Transaction Map</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
            Rebuilt
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
            Other
          </span>
        </div>
      </div>
      <MapContainer
        bounds={bounds}
        style={{ height: 400 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoProps.map((p: PropertyDetail, i: number) => (
          <CircleMarker
            key={`${p.attomId}-${i}`}
            center={[p.lat!, p.lng!]}
            radius={7}
            pathOptions={{
              color: p.isRebuilt ? "#10b981" : "#f97316",
              fillColor: p.isRebuilt ? "#10b981" : "#f97316",
              fillOpacity: 0.7,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-medium">{p.address || "Unknown"}</p>
                <p>
                  {p.offerDate
                    ? new Date(p.offerDate).toLocaleDateString()
                    : ""}
                  {p.offerPrice
                    ? " — $" + p.offerPrice.toLocaleString()
                    : ""}
                </p>
                <p className={p.isRebuilt ? "text-emerald-600" : "text-orange-600"}>
                  {p.isRebuilt ? "Rebuilt" : "Other"}
                  {p.entity ? ` (${p.entity})` : ""}
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
