// Figma "Data Visualization Package" 의 Icons(Feather) 원본 SVG 를 public/icons 에 받아 그대로 씀.
// 색은 글자색을 따르도록 SVG 를 마스크로 깔고 배경을 currentColor 로 채움 (원본 경로는 손대지 않음).
const FILES = {
  home: "home",
  layers: "layers",
  pin: "map-pin",
  chart: "bar-chart-2",
  sparkle: "zap",
  calendar: "calendar",
  dots: "more-vertical",
  plus: "plus",
  minus: "minus",
  expand: "maximize-2",
  download: "download",
  table: "list",
  close: "x",
  arrow: "arrow-up-right",
  check: "check",
  repeat: "repeat",
  info: "info",
  help: "help-circle",
} as const;

export type IconName = keyof typeof FILES;

export default function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const url = `url(/icons/${FILES[name]}.svg)`;
  return <span className="icon" aria-hidden style={{ width: size, height: size, WebkitMaskImage: url, maskImage: url }} />;
}
