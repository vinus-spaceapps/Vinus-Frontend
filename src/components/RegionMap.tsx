import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, Rectangle, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { Region, RegionComparison, Variable } from "../lib/types";
import { TONE_TEXT, TONE_VAR, toneOf, type Tone } from "../tone";
import Icon from "./Icon";

interface Props {
  regions: Region[];
  selected: string | null;
  onSelect?: (id: string) => void;
  comparison?: RegionComparison[]; // 있으면 산지별 추세를 열 지도 색으로
  unit?: string;
  higherIs?: Variable["higher_is"];
  zoom?: number; // 산지를 고르면 이 배율까지 다가감 (산지 화면은 분석 범위 네모가 보이게 더 가까이)
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// 산지 하나 = 번진 열 자국(데이터 색) + 가운데 점. 선택된 산지에는 말풍선 카드.
function heatIcon(tone: Tone | null, sel: boolean, name: string, value: string | null, sub: string) {
  const color = tone ? TONE_VAR[tone] : sel ? "var(--w3)" : "var(--none)";
  return L.divIcon({
    className: "heat-icon",
    html:
      `<div class="heat"${sel ? " data-sel" : ""}${tone ? "" : " data-plain"} style="--tone:${color}">` +
      `<span class="heat-glow"></span><span class="heat-core"></span>` +
      `<span class="heat-tip"><b>${esc(name)}</b>${value ? `<em>${esc(value)}</em>` : ""}<small>${esc(sub)}</small></span></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function FlyTo({ region, zoom }: { region?: Region; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (!region) return;
    const z = Math.max(map.getZoom(), zoom);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) map.setView([region.lat, region.lon], z, { animate: false });
    else map.flyTo([region.lat, region.lon], z, { duration: 0.8 });
  }, [region, map, zoom]);
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

// 왼쪽 동그란 확대·축소·전체 보기 버튼 (Leaflet 기본 컨트롤 대신)
function MapTools({ regions }: { regions: Region[] }) {
  const map = useMap();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);
  const fit = () => map.flyToBounds(L.latLngBounds(regions.map((r) => [r.lat, r.lon] as [number, number])).pad(0.3), { duration: 0.6 });
  return (
    <div className="map-tools" ref={ref}>
      <button className="ic" onClick={() => map.zoomIn()} aria-label="확대">
        <Icon name="plus" />
      </button>
      <button className="ic" onClick={() => map.zoomOut()} aria-label="축소">
        <Icon name="minus" />
      </button>
      <button className="ic" onClick={fit} aria-label="산지 전체 보기">
        <Icon name="expand" />
      </button>
    </div>
  );
}

export default function RegionMap({ regions, selected, onSelect, comparison, unit, higherIs = "worse", zoom = 4 }: Props) {
  const sel = regions.find((r) => r.id === selected);
  // 아이콘을 매 렌더마다 새로 만들면 Leaflet 이 DOM 을 갈아 끼우므로 고정
  const icons = useMemo(
    () =>
      Object.fromEntries(
        regions.map((r) => {
          const c = comparison?.find((x) => x.region_id === r.id);
          const tone = c ? toneOf(c.status, c.direction, higherIs) : null;
          const value = c ? `10년에 ${c.slope_per_decade >= 0 ? "+" : ""}${c.slope_per_decade.toFixed(1)}${unit ?? ""}` : null;
          return [r.id, heatIcon(tone, r.id === selected, r.name, value, c ? c.label : r.country)];
        }),
      ),
    [regions, selected, comparison, unit, higherIs],
  );

  return (
    <>
      <MapContainer center={sel ? [sel.lat, sel.lon] : [30, 10]} zoom={sel ? 4 : 2} minZoom={2} worldCopyJump scrollWheelZoom={false} zoomControl={false}>
        <TileLayer
          // CARTO 타일은 이제 API 키가 필요해서, 키 없이 쓰는 Esri 라이트 그레이 베이스맵 (CSS 로 살짝 와인빛)
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a> &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors'
          maxZoom={12}
        />
        <FlyTo region={sel} zoom={zoom} />
        <WheelOnClick />
        <MapTools regions={regions} />
        {/* 고른 산지의 분석 범위 (백엔드 regions.json bbox: 남·북 위도, 서·동 경도) */}
        {sel?.bbox && (
          <Rectangle
            bounds={[
              [sel.bbox[0], sel.bbox[2]],
              [sel.bbox[1], sel.bbox[3]],
            ]}
            pathOptions={{ color: "#8c3b55", weight: 2, dashArray: "6 5", fillColor: "#8c3b55", fillOpacity: 0.06 }}
            interactive={false}
          />
        )}
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
        <ul className="map-legend" aria-label="지도 색">
          {(["bad", "mid", "good", "none"] as const).map((t) => (
            <li key={t}>
              <i style={{ background: TONE_VAR[t] }} />
              {TONE_TEXT[t]}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
