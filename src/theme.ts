import { useMemo } from "react";

// Recharts 처럼 색을 문자열로 받는 곳에 styles.css 토큰의 실제 값을 넘김 (라이트 테마 하나).
export function useTokens() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const g = (n: string) => s.getPropertyValue(n).trim();
    return {
      ink: g("--dark"),
      axis: g("--axis"),
      muted: g("--muted"),
      barOff: g("--bar-off"),
      w1: g("--w1"),
      w3: g("--w3"),
      w4: g("--w4"),
      blue: g("--good"),
    };
  }, []);
}
