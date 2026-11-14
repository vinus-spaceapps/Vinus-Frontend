import { useMemo } from "react";

// 라이트 테마 하나뿐. Recharts 처럼 색을 문자열로 받는 곳에 styles.css 토큰의 실제 값을 넘김.
export function useTokens() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const g = (n: string) => s.getPropertyValue(n).trim();
    return { fg: g("--fg"), bg: g("--bg"), card: g("--card-solid"), chip: g("--chip"), muted: g("--muted"), faint: g("--faint"), line: g("--line"), none: g("--none"), cool: g("--cool") };
  }, []);
}
