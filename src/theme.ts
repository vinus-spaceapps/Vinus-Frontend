import { useMemo } from "react";

// 라이트 테마 하나뿐. Recharts 처럼 색을 문자열로 받는 곳에 styles.css 토큰의 실제 값을 넘김.
export function useTokens() {
  return useMemo(() => {
    const s = getComputedStyle(document.documentElement);
    const g = (n: string) => s.getPropertyValue(n).trim();
    return {
      text: g("--fg"),
      card: g("--card-solid"),
      muted: g("--muted"),
      line2: g("--line-2"),
      none: g("--none"),
      purple: g("--purple"),
      blue: g("--blue"),
      orange: g("--orange"),
    };
  }, []);
}
