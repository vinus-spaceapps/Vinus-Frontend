// 아이콘: Figma "Full charts components" 의 Icons(f-*) 를 먼저 쓰고, 거기 없는 것(집·지도 핀·달력 등)만 Feather.
// SVG 를 마스크로 써서 색은 글자색(currentColor)을 따름.
const FILES = {
  // Full charts components / Icons
  search: "f-search",
  filter: "f-filter",
  menu: "f-menu",
  comment: "f-comment",
  bars: "f-chart",
  doughnut: "f-doughnut",
  sort: "f-menu-left",
  // Feather (위 세트에 없는 것)
  home: "home",
  layers: "layers",
  pin: "map-pin",
  calendar: "calendar",
  plus: "plus",
  minus: "minus",
  expand: "maximize-2",
  download: "download",
  close: "x",
  check: "check",
} as const;

export type IconName = keyof typeof FILES;

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const url = `url(/icons/${FILES[name]}.svg)`;
  return <span className="icon" aria-hidden style={{ width: size, height: size, WebkitMaskImage: url, maskImage: url }} />;
}
