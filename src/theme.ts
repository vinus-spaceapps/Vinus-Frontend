import { useMemo } from "react";

// Recharts 처럼 색을 문자열로 받는 곳에 styles.css 토큰의 실제 값을 넘김 (어두운 테마 하나).
export function useTokens() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const g = (n: string) => s.getPropertyValue(n).trim();
    return {
      ink: g("--text"), // Sen 추세선: 흰색
      axis: g("--body"),
      muted: g("--faint"), // OLS 점선
      barOff: g("--raised"), // 꺼진 막대
      w1: g("--rose"),
      w3: g("--rose"), // 가장 큰 해·값 선
      w4: g("--rose"), // 면 그라데이션
      blue: g("--good"),
    };
  }, []);
}
