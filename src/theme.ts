import { useMemo, useSyncExternalStore } from "react";

// 다크/라이트 테마. 첫 방문은 라이트(레퍼런스 기본), 고르면 localStorage 에 기억 (index.html 의 인라인 스크립트).
export type Theme = "dark" | "light";

const root = document.documentElement;
const read = (): Theme => (root.dataset.theme === "dark" ? "dark" : "light");
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};

export const useTheme = () => useSyncExternalStore(subscribe, read);

// Recharts 처럼 색을 문자열로 받는 곳용: 지금 테마의 토큰 실제 값
export function useTokens() {
  const theme = useTheme();
  return useMemo(() => {
    const s = getComputedStyle(root);
    const g = (n: string) => s.getPropertyValue(n).trim();
    return { fg: g("--fg"), bg: g("--bg"), card: g("--card-solid"), chip: g("--chip"), muted: g("--muted"), faint: g("--faint"), line: g("--line"), none: g("--none"), cool: g("--cool") };
  }, [theme]);
}

export function setTheme(t: Theme) {
  const apply = () => {
    root.dataset.theme = t;
    try {
      localStorage.setItem("vinus-theme", t);
    } catch {
      /* 저장이 막혀 있어도 이번 화면에는 적용 */
    }
  };
  // 밝기가 한 번에 뒤집히지 않게 지원 브라우저에서는 짧은 크로스페이드
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition) doc.startViewTransition(apply);
  else apply();
}
