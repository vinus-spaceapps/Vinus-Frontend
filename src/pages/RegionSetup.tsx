import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Card, Media } from "../components/DashCards";
import Icon from "../components/Icon";
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

  const picked = useMemo(() => sel.basket.map((id) => variables.find((v) => v.id === id)).filter(Boolean), [sel.basket, variables]);
  const region = regions.find((r) => r.id === sel.region);

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
    <main>
      <header className="page-hero">
        <div className="page-hero-art" aria-hidden>
          <span />
        </div>
        <div className="wrap page-hero-row">
          <div>
            <p className="label">2단계</p>
            <h1>산지와 기간</h1>
            <p className="lead">고른 변수: {picked.map((v) => v!.name).join(", ")}</p>
          </div>
          <button className="btn secondary" onClick={() => nav("/variables")}>
            변수 바꾸기
          </button>
        </div>
      </header>

      <div className="wrap region-layout">
        <Card className="map-card" title="지도" desc="점을 누르면 그 산지로. 점선 네모는 자료를 평균 내는 범위">
          <div className="map-frame tall">
            <RegionMap regions={regions} selected={sel.region} onSelect={(id) => set({ region: id })} zoom={6} />
          </div>
        </Card>

        <div className="side-stack">
          <Card title="산지" desc={`${regions.length}곳`}>
            <ul className="region-list">
              {regions.map((r) => {
                const on = r.id === sel.region;
                return (
                  <li key={r.id}>
                    <button className={`region-item ${on ? "sel" : ""}`} aria-pressed={on} onClick={() => set({ region: r.id })}>
                      <Media name={r.name} sub={r.blurb} size={40} option={<span className={`sq ${on ? "on" : ""}`}>{on ? <Icon name="check" size={18} /> : <Icon name="plus" size={18} />}</span>} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card
            title="기간"
            desc={`${sel.start}–${sel.end}, ${sel.end - sel.start + 1}년`}
            footer={
              <button className="btn primary block" disabled={!sel.region} onClick={go}>
                {sel.region ? "분석 시작" : "산지를 고르세요"}
              </button>
            }
          >
            <div className="range-dual">
              <div className="range-track" />
              <div className="range-fill" style={{ left: `${pct(sel.start)}%`, width: `${pct(sel.end) - pct(sel.start)}%` }} />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={sel.start} onChange={(e) => setStart(Number(e.target.value))} aria-label="시작 연도" />
              <input type="range" min={MIN_YEAR} max={MAX_YEAR} value={sel.end} onChange={(e) => setEnd(Number(e.target.value))} aria-label="끝 연도" />
            </div>
            <label className="input">
              <Icon name="calendar" size={18} />
              <select value={sel.start} onChange={(e) => setStart(Number(e.target.value))} aria-label="시작 연도 선택">
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <span className="muted">–</span>
              <select value={sel.end} onChange={(e) => setEnd(Number(e.target.value))} aria-label="끝 연도 선택">
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            {latestStart > sel.start && (
              <p className="warn-line">
                {picked.filter((v) => v!.start_year > sel.start).map((v) => `${v!.name}: ${v!.start_year}년부터`).join(", ")}. 변수별 자료 시작 연도에 맞춰 계산.
              </p>
            )}

            <details>
              <summary>생육 단계 날짜 (선택)</summary>
              <p className="card-note">비우면 산지 기본값{region ? ` (${region.name}: 발아 ${region.stages.budburst}, 수확 ${region.stages.harvest})` : ""}</p>
              <div className="stage-grid">
                {STAGES.map((k) => (
                  <label key={k}>
                    {STAGE_LABEL[k]} (월-일)
                    <input
                      className="input"
                      placeholder={region?.stages[k] ?? "MM-DD"}
                      value={sel.stages[k] ?? ""}
                      pattern="\d{2}-\d{2}"
                      onChange={(e) => set({ stages: { ...sel.stages, [k]: e.target.value } })}
                    />
                  </label>
                ))}
              </div>
            </details>
            <p className="card-note">산지 단위(약 50km 격자) 평균. 개별 밭과 다를 수 있음.</p>
          </Card>
        </div>
      </div>
    </main>
  );
}
