import type { Direction, Variable, VerdictStatus } from "./lib/types";

// 데이터 색: 생산자 입장에서 나빠짐(빨강)·좋아짐(초록)·엇갈림/중립(주황)·뚜렷하지 않음(회색).
// 같은 '증가'라도 지표가 나쁜 쪽(서리일수)인지 좋은 쪽인지(higher_is)에 따라 색이 달라짐.
export type Tone = "bad" | "good" | "mid" | "none";

export function toneOf(status: VerdictStatus, direction: Direction, higherIs: Variable["higher_is"]): Tone {
  if (status === "mixed") return "mid";
  if (status !== "significant" || direction === "flat") return "none";
  if (higherIs === "neutral") return "mid";
  return (direction === "increase") === (higherIs === "worse") ? "bad" : "good";
}

export const TONE_VAR: Record<Tone, string> = { bad: "var(--bad)", good: "var(--good)", mid: "var(--mid)", none: "var(--none)" };
export const TONE_TEXT: Record<Tone, string> = { bad: "나빠지는 중", good: "좋아지는 중", mid: "엇갈림·중립", none: "뚜렷하지 않음" };

// Figma 히트맵 색 막대와 같은 순서: 초록 → 노랑 → 주황 → 빨강 (Green·Yellow·Orange·Red 토큰)
export const HEAT_STOPS: [number, [number, number, number]][] = [
  [0, [15, 202, 122]],
  [0.4, [251, 198, 47]],
  [0.7, [247, 162, 59]],
  [1, [247, 93, 95]],
];

// 값 크기 → 색. 나쁜 쪽 지표는 클수록 빨강, 좋은 쪽 지표는 반대.
export function scaleColor(t: number, higherIs: Variable["higher_is"]): string {
  let x = Math.min(1, Math.max(0, t));
  if (higherIs === "better") x = 1 - x;
  let i = 0;
  while (i < HEAT_STOPS.length - 2 && x > HEAT_STOPS[i + 1][0]) i++;
  const [a, ca] = HEAT_STOPS[i], [b, cb] = HEAT_STOPS[i + 1];
  const k = (x - a) / (b - a);
  const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

// 색 막대(범례)용 CSS 그라데이션
export const heatGradient = (higherIs: Variable["higher_is"]) =>
  `linear-gradient(90deg, ${[0, 0.2, 0.4, 0.55, 0.7, 0.85, 1].map((t) => scaleColor(t, higherIs)).join(", ")})`;
