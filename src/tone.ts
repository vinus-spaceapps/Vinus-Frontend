import type { Direction, Variable, VerdictStatus } from "./lib/types";

// 생산자 입장 색: 나빠짐(와인)·좋아짐(파랑, Figma 팔레트 #0077B6)·엇갈림(옅은 와인)·뚜렷하지 않음(회색).
// 같은 '증가'라도 지표가 나쁜 쪽(서리일수)인지 좋은 쪽인지(higher_is)에 따라 색이 달라짐.
export type Tone = "bad" | "good" | "mid" | "none";

export function toneOf(status: VerdictStatus, direction: Direction, higherIs: Variable["higher_is"]): Tone {
  if (status === "mixed") return "mid";
  if (status !== "significant" || direction === "flat") return "none";
  if (higherIs === "neutral") return "mid";
  return (direction === "increase") === (higherIs === "worse") ? "bad" : "good";
}

export const TONE_VAR: Record<Tone, string> = { bad: "var(--bad)", good: "var(--good)", mid: "var(--mid)", none: "var(--none)" };
export const TONE_TEXT: Record<Tone, string> = { bad: "Worsening", good: "Improving", mid: "Mixed or neutral", none: "No clear trend" };

// Figma contributions 히트맵의 4단계 (Less → More): 옅음 → 진함
export const HEAT_LEVELS = ["var(--w9)", "var(--w6)", "var(--w3)", "var(--w1)"];
