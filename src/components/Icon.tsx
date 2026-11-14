// 아이콘 몇 개뿐이라 라이브러리 없이 인라인 SVG. 선 두께·크기를 한 곳에서 맞춤.
const PATHS = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  layers: "M12 4 3 8.5l9 4.5 9-4.5zM3 12.5l9 4.5 9-4.5M3 16.5l9 4.5 9-4.5",
  pin: "M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21zm0-8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  chart: "M4 19h16M6 15l4-4 3 3 5-6",
  sparkle: "M12 3.5l1.8 5 5 1.8-5 1.8-1.8 5-1.8-5-5-1.8 5-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
  moon: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  calendar: "M5 6.5h14a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1zM4 10.5h16M8.5 4v4M15.5 4v4",
  dots: "M12 6.5v.01M12 12v.01M12 17.5v.01",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  expand: "M14 5h5v5M10 19H5v-5M19 5l-6 6M5 19l6-6",
  filter: "M4 6h16M7 12h10M10 18h4",
  download: "M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14",
  table: "M4 5.5h16v13H4zM4 10h16M4 14.5h16M10 5.5v13",
  close: "M6 6l12 12M18 6 6 18",
  arrow: "M7 17 17 7M9 7h8v8",
  check: "M5 12.5l4.5 4.5L19 7.5",
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const bold = name === "dots";
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={bold ? 3 : 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
