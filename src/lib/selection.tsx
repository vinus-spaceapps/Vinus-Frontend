import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { StageKey } from "./types";

export const BASKET_LIMIT = 3;
// 백엔드 실제 자료가 2001~2026년 (백엔드 AnalyzeRequest 기본값과 같음)
export const DATA_START = 2001;
export const DEFAULT_START = 2001;
export const DEFAULT_END = 2026;

// 변수 고르기 → 지역 설정 사이에 들고 다니는 선택 상태.
// 분석 페이지는 URL 쿼리가 기준이고(공유·시연 링크용), 여기 값은 다음 화면의 기본값이 됩니다.
export interface Selection {
  basket: string[];
  region: string | null;
  start: number;
  end: number;
  stages: Partial<Record<StageKey, string>>;
}

const EMPTY: Selection = { basket: [], region: null, start: DEFAULT_START, end: DEFAULT_END, stages: {} };
const KEY = "vinus.selection";

function load(): Selection {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

interface Ctx {
  sel: Selection;
  set: (patch: Partial<Selection>) => void;
  addVar: (id: string) => boolean;
  removeVar: (id: string) => void;
}

const SelectionContext = createContext<Ctx | null>(null);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [sel, setSel] = useState<Selection>(load);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(sel));
    } catch {
      /* 저장 불가 환경은 무시 */
    }
  }, [sel]);

  const ctx: Ctx = {
    sel,
    set: (patch) => setSel((s) => ({ ...s, ...patch })),
    addVar: (id) => {
      if (sel.basket.includes(id) || sel.basket.length >= BASKET_LIMIT) return false;
      setSel((s) => (s.basket.includes(id) || s.basket.length >= BASKET_LIMIT ? s : { ...s, basket: [...s.basket, id] }));
      return true;
    },
    removeVar: (id) => setSel((s) => ({ ...s, basket: s.basket.filter((b) => b !== id) })),
  };
  return <SelectionContext.Provider value={ctx}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("SelectionProvider 밖에서 useSelection 을 썼습니다");
  return ctx;
}

// 분석 페이지 URL  /analyze?v=a,b&r=region&s=2003&e=2025&t=a:-2
export interface AnalyzeParams {
  variables: string[];
  region: string;
  start: number;
  end: number;
  thresholds: Record<string, number>;
}

export function toSearch(p: AnalyzeParams): string {
  const q = new URLSearchParams();
  q.set("v", p.variables.join(","));
  q.set("r", p.region);
  q.set("s", String(p.start));
  q.set("e", String(p.end));
  const t = Object.entries(p.thresholds).map(([k, v]) => `${k}:${v}`);
  if (t.length) q.set("t", t.join(","));
  return `?${q.toString()}`;
}

export function fromSearch(search: string): AnalyzeParams | null {
  const q = new URLSearchParams(search);
  const variables = (q.get("v") ?? "").split(",").filter(Boolean).slice(0, BASKET_LIMIT);
  const region = q.get("r");
  if (!variables.length || !region) return null;
  const thresholds: Record<string, number> = {};
  for (const pair of (q.get("t") ?? "").split(",").filter(Boolean)) {
    const [k, v] = pair.split(":");
    if (k && v !== undefined && !Number.isNaN(Number(v))) thresholds[k] = Number(v);
  }
  return {
    variables,
    region,
    start: Math.max(Number(q.get("s")) || DEFAULT_START, DATA_START),
    end: Number(q.get("e")) || DEFAULT_END,
    thresholds,
  };
}
