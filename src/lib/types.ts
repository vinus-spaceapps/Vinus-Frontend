// 백엔드(Vinus-Backend) 응답 타입

export type CategoryId = "temp_frost" | "rain_water" | "smoke_air" | "growth";

export interface Category {
  id: CategoryId;
  name: string;
}

export interface Variable {
  id: string;
  name: string;
  category: CategoryId;
  short: string;
  unit: string;
  dataset: string;
  source: string;
  start_year: number;
  end_year: number;
  resolution: string;
  stage: string;
  condition: string;
  threshold: number | null;
  threshold_unit: string;
  threshold_options: number[];
  aggregation: "count" | "sum" | "mean";
  robust: boolean;
  higher_is: "worse" | "better" | "neutral";
  sections: { definition?: string; why?: string; guide?: string; caveats?: string; references?: string };
}

export type StageKey = "budburst" | "flowering" | "veraison" | "harvest";

export interface Region {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  hemisphere: "N" | "S";
  stages: Record<StageKey, string>;
  blurb: string;
}

export type VerdictStatus = "significant" | "mixed" | "not_significant";
export type Direction = "increase" | "decrease" | "flat";

export interface Verdict {
  status: VerdictStatus;
  direction: Direction;
  label: string;
}

export interface Detectable {
  status: "need_more" | "length_enough" | "no_trend";
  total_years: number | null;
  more_years: number | null;
}

export interface YearValue {
  year: number;
  value: number;
}

export interface Stats {
  n: number;
  method: "ols" | "sen";
  slope_per_year: number;
  slope_per_decade: number;
  ci_per_decade: [number, number];
  ols: { slope_per_decade: number; ci_per_decade: [number, number]; t: number | null; df: number; p: number; p_ar1: number; resid_lag1: number };
  sen: { slope_per_decade: number; ci_per_decade: [number, number] };
  mk: { s: number; z: number; p: number; tau: number };
  verdict: Verdict;
  detectable: Detectable | null;
  early: { from: number; to: number; mean: number };
  late: { from: number; to: number; mean: number };
  extremes: { year: number; value: number; anomaly: number }[];
  leave_out: { year: number; value: number; p_t: number; p_mk: number; slope_per_decade: number; verdict: Verdict; changes_verdict: boolean };
  flags: ("tests_disagree" | "one_year_drives_result" | "autocorrelation_weakens")[];
  mean: number;
}

export interface RegionComparison {
  region_id: string;
  name: string;
  lat: number;
  lon: number;
  status: VerdictStatus;
  direction: Direction;
  label: string;
  slope_per_decade: number;
  p_t: number;
  p_mk: number;
  q_mk: number;
  is_mock: boolean;
}

export interface VariableResult {
  variable: Variable;
  threshold: number | null;
  series: YearValue[];
  trend: { ols: YearValue[]; sen: YearValue[] };
  stats: Stats;
  start: number;
  end: number;
  is_mock: boolean;
  source_note: string;
  notes: string[];
  verdict_text: string;
  regions: RegionComparison[];
  overlay: null | {
    label: string;
    points: YearValue[];
    correlation: { r: number; p: number; n: number } | null;
    common_years: number;
    note: string;
  };
}

export interface AnalysisResponse {
  region: Region;
  start: number;
  end: number;
  stages: Record<StageKey, string>;
  resolution_note: string;
  is_mock: boolean;
  results: VariableResult[];
}

export interface AnalyzeQuery {
  variables: string[];
  region: string;
  start: number;
  end: number;
  thresholds?: Record<string, number>;
  stages?: Partial<Record<StageKey, string>> | null;
  user_series?: YearValue[] | null;
  user_label?: string | null;
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface VariableChatResponse {
  reply: string;
  add: { id: string; name: string; reason: string }[];
  source: "llm" | "fallback";
  fallback_reason?: string;
}

export type NextStepChange =
  | { type: "threshold"; value: number }
  | { type: "region"; value: string }
  | { type: "start_year"; value: number }
  | { type: "add_variable"; value: string };

export interface InsightCard {
  summary: string;
  numbers: string;
  confidence: string;
  meaning: string;
  next_steps: { label: string; change: NextStepChange }[];
  sources: string[];
}

export interface Decision {
  id: string;
  label: string;
}

export type InsightResponse =
  | { type: "need_context"; question: string; options: Decision[] }
  | { type: "card"; card: InsightCard; unverified_numbers: string[]; decision: string; source: "llm" | "fallback"; fallback_reason?: string }
  | { type: "answer"; answer: string; sources: string[]; unverified_numbers: string[]; source: "llm" | "fallback"; fallback_reason?: string };

export interface Health {
  ok: boolean;
  ai: { enabled: boolean; model: string; reason: string };
}
