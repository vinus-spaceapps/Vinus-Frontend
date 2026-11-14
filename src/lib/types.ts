// 백엔드(Vinus-Backend) 응답 타입

// 카테고리·묶음은 백엔드가 정함 (기온·서리, 더위, 비, 가뭄·토양, 병해·습도, 햇빛·바람, 연기·대기, 생육·시기)
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  name: string;
}

// 지표 묶음: core(핵심 100) · etccdi · extremes(평년 대비 극값) · stats(월·계절 기본 통계)
export interface Family {
  id: string;
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
  aggregation: "count" | "sum" | "mean" | "min" | "max";
  robust: boolean;
  higher_is: "worse" | "better" | "neutral";
  station_var: "tmin" | "tmax" | "tmean" | null;
  has_real_data: boolean;
  keywords: string[];
  family: string;
  sections: { definition?: string; why?: string; guide?: string; caveats?: string; references?: string };
}

export type StageKey = "budburst" | "flowering" | "veraison" | "harvest";

export interface Region {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number]; // 남·북 위도, 서·동 경도
  hemisphere: "N" | "S";
  stages: Record<StageKey, string>;
  blurb: string;
}

// 지상 관측소·MODIS 1km 와 비교한 검증 요약 (산지마다 있는 것만)
export interface Validation {
  station?: { id: string; days: number; tmin_bias: number; tmin_corr: number; tmax_bias: number; tmax_corr: number };
  modis?: { periods: number; lst_minus_grid_tmin: number; pixel_spread_mean: number; pixel_spread_max: number; cold_pixel_periods: number; grid_cold_periods: number };
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
  validation: Validation | null;
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
  ai: { enabled: boolean; provider?: string; model: string; reason: string };
}
