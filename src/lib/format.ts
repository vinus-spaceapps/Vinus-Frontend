import type { Direction, VerdictStatus } from "./types";

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
