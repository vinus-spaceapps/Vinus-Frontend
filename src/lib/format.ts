import type { Direction, VerdictStatus, YearValue } from "./types";

export const signed = (x: number, d = 1) => {
  const s = x.toFixed(d);
  return x > 0 ? `+${s}` : s === `-${(0).toFixed(d)}` ? (0).toFixed(d) : s;
};

export const pval = (p: number) => (p < 0.001 ? "< 0.001" : p.toFixed(3));

// "p = 0.012" 또는 "p < 0.001"
export const pText = (p: number) => (p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`);

export const fmtNum = (x: number, d = 1) => (Number.isInteger(x) ? String(x) : x.toFixed(d));

// 지도·칩에 쓰는 추세 색: 증가/감소/유의하지 않음/엇갈림
export function trendTone(status: VerdictStatus, direction: Direction): "up" | "down" | "none" | "mixed" {
  if (status === "significant") return direction === "increase" ? "up" : direction === "decrease" ? "down" : "none";
  if (status === "mixed") return "mixed";
  return "none";
}

export const TONE_COLOR: Record<ReturnType<typeof trendTone>, string> = {
  up: "#c0392b",
  down: "#2b6cb0",
  mixed: "#d69e2e",
  none: "#8a8f98",
};

export const TONE_LABEL: Record<ReturnType<typeof trendTone>, string> = {
  up: "증가 (유의)",
  down: "감소 (유의)",
  mixed: "검정 엇갈림",
  none: "유의하지 않음",
};

// 좁은 화면에서는 AI 패널이 본문을 덮으므로 처음엔 닫아 둡니다.
export const wideScreen = () => typeof window !== "undefined" && window.innerWidth > 1100;

export const STAGE_LABEL = { budburst: "발아", flowering: "개화", veraison: "착색", harvest: "수확" } as const;

// 추세선은 직선이라 백엔드가 양 끝 두 점만 보냄 → 해마다 값은 두 점 사이를 이어서
export function lineAt(points: YearValue[], year: number): number | undefined {
  if (points.length < 2) return points[0]?.value;
  const [a, b] = [points[0], points[points.length - 1]];
  return a.value + ((b.value - a.value) * (year - a.year)) / (b.year - a.year || 1);
}
