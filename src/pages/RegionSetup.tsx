import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import RegionMap from "../components/RegionMap";
import { useCatalog } from "../lib/catalog";
import { STAGE_LABEL } from "../lib/format";
import { DATA_START, DEFAULT_END, toSearch, useSelection } from "../lib/selection";
import type { StageKey } from "../lib/types";

const MIN_YEAR = DATA_START;
const MAX_YEAR = DEFAULT_END;
const STAGES: StageKey[] = ["budburst", "flowering", "veraison", "harvest"];

export default function RegionSetup() {
  const nav = useNavigate();
  const { regions, variables } = useCatalog();
  const { sel, set } = useSelection();
  const [q, setQ] = useState("");

  const picked = useMemo(() => sel.basket.map((id) => variables.find((v) => v.id === id)).filter(Boolean), [sel.basket, variables]);
  const region = regions.find((r) => r.id === sel.region);
  const filtered = regions.filter((r) => !q || `${r.name} ${r.country}`.includes(q.trim()));

  if (sel.basket.length === 0) return <Navigate to="/variables" replace />;

  const latestStart = Math.max(...picked.map((v) => v!.start_year));
  const setStart = (y: number) => set({ start: Math.min(y, sel.end - 5) });
  const setEnd = (y: number) => set({ end: Math.max(y, sel.start + 5) });
  const pct = (y: number) => ((y - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)) * 100;
  const years = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i);

  const go = () => {
    if (!sel.region) return;
    nav(`/analyze${toSearch({ variables: sel.basket, region: sel.region, start: sel.start, end: sel.end, thresholds: {} })}`);
  };

  return (
    <main className="container page">
      <div className="page-title">
        <div>
          <h1>지역·기간 설정</h1>
          <p>선택한 변수: {picked.map((v) => v!.name).join(", ")}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => nav("/variables")}>
          변수 변경
        </button>
      </div>

      <div className="region-layout">
        <div className="card map-box">
          <RegionMap regions={regions} selected={sel.region} onSelect={(id) => set({ region: id })} />
        </div>

        <div className="card region-side">
          <div>
            <label className="field-label" htmlFor="region-search">
              산지
            </label>
            <input id="region-search" className="search" placeholder="산지 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="region-list">
              {filtered.map((r) => (
                <button key={r.id} className={`region-item ${r.id === sel.region ? "sel" : ""}`} aria-pressed={r.id === sel.region} onClick={() => set({ region: r.id })}>
                  <span className="dot" aria-hidden />
                  <b>{r.name}</b>
                  <span className="leader" aria-hidden />
                  <span className="ctry">{r.country}</span>
                </button>
              ))}
              {filtered.length === 0 && <span className="muted small">검색 결과 없음</span>}
            </div>
            {region && <p className="muted small" style={{ marginTop: 8 }}>{region.blurb}</p>}
          </div>

          <div>
            <span className="field-label">
              기간 {sel.start}~{sel.end} ({sel.end - sel.start + 1}년)
            </span>
            <div className="range-dual">
              <div className="range-track" />
              <div className="range-fill" style={{ left: `${pct(sel.start)}%`, width: `${pct(sel.end) - pct(sel.start)}%` }} />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={sel.start} onChange={(e) => setStart(Number(e.target.value))} aria-label="시작 연도" />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={sel.end} onChange={(e) => setEnd(Number(e.target.value))} aria-label="끝 연도" />
            </div>
            <div className="year-row" style={{ marginTop: 8 }}>
              <select value={sel.start} onChange={(e) => setStart(Number(e.target.value))} aria-label="시작 연도 선택">
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <span>~</span>
              <select value={sel.end} onChange={(e) => setEnd(Number(e.target.value))} aria-label="끝 연도 선택">
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="avail">
              {picked.map((v) => (
                <span key={v!.id} className={v!.start_year > sel.start ? "warn" : ""}>
                  {v!.name}: {v!.dataset} {v!.start_year}~ {v!.start_year > sel.start ? `(${v!.start_year}년부터 분석)` : ""}
                </span>
              ))}
              {latestStart > sel.start && <span>변수별 데이터 시작 연도에 맞춰 자동 조정</span>}
            </div>
          </div>

          <details>
            <summary>생육 단계 날짜 (선택)</summary>
            <p className="muted small" style={{ margin: "8px 0" }}>
              미입력 시 산지 기본값{region ? ` (${region.name}: 발아 ${region.stages.budburst}, 수확 ${region.stages.harvest})` : ""}
            </p>
            <div className="stage-grid">
              {STAGES.map((k) => (
                <label key={k}>
                  {STAGE_LABEL[k]} (월-일)
                  <input
                    placeholder={region?.stages[k] ?? "MM-DD"}
                    value={sel.stages[k] ?? ""}
                    pattern="\d{2}-\d{2}"
                    onChange={(e) => set({ stages: { ...sel.stages, [k]: e.target.value } })}
                  />
                </label>
              ))}
            </div>
          </details>

          <div className="note-line">산지 단위(수십 km) 평균값. 개별 밭과 다를 수 있음.</div>

          <button className="btn btn-primary btn-lg" disabled={!sel.region} onClick={go}>
            {sel.region ? "분석 시작" : "산지를 선택하세요"}
          </button>
        </div>
      </div>
    </main>
  );
}
