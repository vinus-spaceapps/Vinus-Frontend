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

// 값 크기를 초록→주황→빨강으로 (나쁜 쪽 지표는 클수록 빨강, 좋은 쪽은 반대). 그래프 선·흐름 띠 그라데이션용
const STOPS: [number, [number, number, number]][] = [
  [0, [116, 214, 74]],
  [0.5, [242, 161, 58]],
  [1, [229, 67, 45]],
];
export function scaleColor(t: number, higherIs: Variable["higher_is"]): string {
  let x = Math.min(1, Math.max(0, t));
  if (higherIs === "better") x = 1 - x;
  const i = x <= 0.5 ? 0 : 1;
  const [a, ca] = STOPS[i], [b, cb] = STOPS[i + 1];
  const k = (x - a) / (b - a);
  const c = ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}
