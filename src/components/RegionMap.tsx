import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import { TONE_COLOR, TONE_LABEL, trendTone } from "../lib/format";
import type { Region, RegionComparison } from "../lib/types";

interface Props {
  regions: Region[];
  selected: string | null;
  onSelect?: (id: string) => void;
  comparison?: RegionComparison[]; // 있으면 추세 방향 색으로 칠함
  unit?: string;
}

function pinIcon(color: string, big: boolean) {
  return L.divIcon({
    className: "",
    html: `<div class="pin ${big ? "big" : ""}" style="background:${color}"></div>`,
    iconSize: big ? [24, 24] : [16, 16],
    iconAnchor: big ? [12, 12] : [8, 8],
  });
}

function FlyTo({ region }: { region?: Region }) {
  const map = useMap();
  useEffect(() => {
    if (region) map.flyTo([region.lat, region.lon], Math.max(map.getZoom(), 4), { duration: 0.8 });
  }, [region, map]);
  return null;
}

export default function RegionMap({ regions, selected, onSelect, comparison, unit }: Props) {
  const sel = regions.find((r) => r.id === selected);
  return (
    <>
      <MapContainer center={sel ? [sel.lat, sel.lon] : [30, 10]} zoom={sel ? 4 : 2} minZoom={2} worldCopyJump scrollWheelZoom>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={12}
        />
        <FlyTo region={sel} />
        {regions.map((r) => {
          const c = comparison?.find((x) => x.region_id === r.id);
          const tone = c ? trendTone(c.status, c.direction) : null;
          const color = tone ? TONE_COLOR[tone] : r.id === selected ? "#7a1f3d" : "#b07a8c";
          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lon]}
              icon={pinIcon(color, r.id === selected)}
              eventHandlers={onSelect ? { click: () => onSelect(r.id) } : undefined}
              zIndexOffset={r.id === selected ? 1000 : 0}
            >
              <Tooltip direction="top" offset={[0, -10]} permanent={r.id === selected}>
                <b>{r.name}</b> · {r.country}
                {c && (
                  <>
                    <br />
                    {c.label} · 10년에 {c.slope_per_decade >= 0 ? "+" : ""}
                    {c.slope_per_decade.toFixed(1)}
                    {unit}
                  </>
                )}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
      {comparison && (
        <div className="map-legend">
          {(["up", "down", "mixed", "none"] as const).map((t) => (
            <span key={t}>
              <i style={{ background: TONE_COLOR[t] }} />
              {TONE_LABEL[t]}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
