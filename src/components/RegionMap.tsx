import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { TONE_COLOR, TONE_LABEL, trendTone } from "../lib/format";
import type { Region, RegionComparison } from "../lib/types";
import { useTheme } from "../theme";

interface Props {
  regions: Region[];
  selected: string | null;
  onSelect?: (id: string) => void;
  comparison?: RegionComparison[]; // 있으면 추세 방향 색으로 칠함
  unit?: string;
  padRight?: number; // 오른쪽을 덮는 패널 폭: 선택 산지를 보이는 영역 가운데로
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// 로고의 궤도 모양 마커: 가운데 점(데이터 색) + 기울어진 궤도, 선택된 산지에만 위성 점.
function orbitIcon(color: string, sel: boolean, name: string, sub: string | null) {
  return L.divIcon({
    className: "mk-icon",
    html:
      `<div class="mk"${sel ? " data-sel" : ""} style="--tone:${color}">` +
      `<svg class="mk-orbit" viewBox="0 0 44 28" aria-hidden="true"><ellipse cx="22" cy="14" rx="19" ry="7" transform="rotate(-18 22 14)"/></svg>` +
      `<span class="mk-core"></span>${sel ? '<span class="mk-sat"></span>' : ""}` +
      `<span class="mk-label">${esc(name)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></div>`,
    iconSize: [44, 28],
    iconAnchor: [22, 14],
  });
}

function FlyTo({ region, padRight }: { region?: Region; padRight: number }) {
  const map = useMap();
  useEffect(() => {
    if (!region) return;
    const z = Math.max(map.getZoom(), 4);
    const center = map.unproject(map.project([region.lat, region.lon], z).add([padRight / 2, 0]), z);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) map.setView(center, z, { animate: false });
    else map.flyTo(center, z, { duration: 0.8 });
  }, [region, map, padRight]);
  return null;
}

// 페이지 스크롤이 지도에 걸리지 않게: 휠 줌은 지도를 누른 뒤에만, 지도를 벗어나면 다시 끔.
function WheelOnClick() {
  const map = useMapEvents({
    click: () => map.scrollWheelZoom.enable(),
    mouseout: () => map.scrollWheelZoom.disable(),
  });
  return null;
}

export default function RegionMap({ regions, selected, onSelect, comparison, unit, padRight = 0 }: Props) {
  const sel = regions.find((r) => r.id === selected);
  const theme = useTheme();
  // 아이콘을 매 렌더마다 새로 만들면 Leaflet 이 DOM 을 갈아 끼워 위성 등장 효과가 반복되므로 고정
  const icons = useMemo(
    () =>
      Object.fromEntries(
        regions.map((r) => {
          const c = comparison?.find((x) => x.region_id === r.id);
          const isSel = r.id === selected;
          const color = c ? TONE_COLOR[trendTone(c.status, c.direction)] : isSel ? "var(--fg)" : "rgb(var(--fg-rgb) / .45)";
          const sub = c ? `${c.label} · 10년에 ${c.slope_per_decade >= 0 ? "+" : ""}${c.slope_per_decade.toFixed(1)}${unit ?? ""}` : r.country;
          return [r.id, orbitIcon(color, isSel, r.name, sub)];
        }),
      ),
    [regions, selected, comparison, unit],
  );

  return (
    <>
      <MapContainer center={sel ? [sel.lat, sel.lon] : [30, 10]} zoom={sel ? 4 : 2} minZoom={2} worldCopyJump scrollWheelZoom={false}>
        <TileLayer
          // CARTO 타일은 이제 API 키가 필요해서, 키 없이 쓰는 Esri 그레이 베이스맵 (테마에 맞춰 다크/라이트)
          key={theme}
          url={`https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${theme === "light" ? "Light" : "Dark"}_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
          maxZoom={12}
        />
        <FlyTo region={sel} padRight={padRight} />
        <WheelOnClick />
        {regions.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lon]}
            icon={icons[r.id]}
            title={r.name}
            riseOnHover
            eventHandlers={onSelect ? { click: () => onSelect(r.id) } : undefined}
            zIndexOffset={r.id === selected ? 1000 : 0}
          />
        ))}
      </MapContainer>
      {comparison && (
        <div className="map-legend glass">
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
