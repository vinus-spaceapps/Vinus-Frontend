import { useMemo } from "react";

// Recharts 처럼 색을 문자열로 받는 곳에 styles.css 토큰의 실제 값을 넘김 (어두운 테마 하나).
export function useTokens() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const g = (n: string) => s.getPropertyValue(n).trim();
    return {
      ink: g("--text"), // Sen trend line: white
      axis: g("--body"),
      muted: g("--faint"), // OLS dashed line
      barOff: g("--raised"), // inactive bars
      w1: g("--rose"),
      w3: g("--rose"), // highest year and value line
      w4: g("--rose"), // area gradient
      blue: g("--good"),
    };
  }, []);
}
