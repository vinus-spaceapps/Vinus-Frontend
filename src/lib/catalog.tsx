import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { Category, Health, Region, Variable } from "./types";

interface CatalogState {
  categories: Category[];
  variables: Variable[];
  regions: Region[];
  health: Health | null;
  loading: boolean;
  error: string | null;
  variable: (id: string) => Variable | undefined;
  region: (id: string) => Region | undefined;
}

const CatalogContext = createContext<CatalogState | null>(null);

// 변수 목록·산지 목록·AI 상태를 앱 시작 때 한 번 불러옵니다.
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.variables(), api.regions(), api.health().catch(() => null)])
      .then(([v, r, h]) => {
        if (!alive) return;
        setCategories(v.categories);
        setVariables(v.variables);
        setRegions(r);
        setHealth(h);
      })
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const value: CatalogState = {
    categories,
    variables,
    regions,
    health,
    loading,
    error,
    variable: (id) => variables.find((v) => v.id === id),
    region: (id) => regions.find((r) => r.id === id),
  };
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("CatalogProvider 밖에서 useCatalog 를 썼습니다");
  return ctx;
}
