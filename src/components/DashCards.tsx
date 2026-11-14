import type { ReactNode } from "react";
import { useState } from "react";
import { pText, signed } from "../lib/format";
import type { Region, VariableResult, YearValue, Variable } from "../lib/types";
import { heatGradient, scaleColor, TONE_TEXT, TONE_VAR, toneOf, type Tone } from "../tone";
import Icon, { type IconName } from "./Icon";
import TrendChart from "./TrendChart";

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

/* ======================================================================
   Figma Components 의 차트 카드 뼈대 (Header 6:10412 · Tabs 13:33585 · Body 6:10413)
   - Header: Meta Info 14 / 제목 22 Bold / 값 26 Bold / 부제 16 회색, 오른쪽 위 32px 아이콘 버튼
   - Tabs: 같은 너비 회색 탭 줄 (선택 = 와인)
   - Data: 범례(Key Item) + 차트
   - Body: Meta Info 14 / 제목 24 Bold / 부제 16
   ====================================================================== */
export interface CardTab {
  id: string;
  label: string;
}
export function ChartCard({
  meta,
  title,
  value,
  sub,
  action,
  tabs,
  tab,
  onTab,
  body,
  children,
  className = "",
}: {
  meta?: string;
  title: string;
  value?: ReactNode;
  sub?: string;
  action?: { icon: IconName; label: string; onClick: () => void };
  tabs?: CardTab[];
  tab?: string;
  onTab?: (id: string) => void;
  body?: { meta?: string; title: string; sub?: string };
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`fcard ${className}`}>
      <header className="fc-head">
        <div className="fc-text">
          {meta && <p className="fc-meta">{meta}</p>}
          <h2 className="fc-title">{title}</h2>
          {value !== undefined && <p className="fc-value num">{value}</p>}
          {sub && <p className="fc-sub">{sub}</p>}
        </div>
        {action && (
          <button className="fc-icon" onClick={action.onClick} aria-label={action.label} title={action.label}>
            <Icon name={action.icon} />
          </button>
        )}
        {tabs && (
          <div className="fc-tabs" role="group" aria-label={`${title} 보기`}>
            {tabs.map((t) => (
              <button key={t.id} className="fc-tab" aria-pressed={tab === t.id} onClick={() => onTab?.(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>
      {children && <div className="fc-data">{children}</div>}
      {body && (
        <footer className="fc-body">
          {body.meta && <p className="fc-meta">{body.meta}</p>}
          <p className="fc-body-title">{body.title}</p>
          {body.sub && <p className="fc-sub">{body.sub}</p>}
        </footer>
      )}
    </section>
  );
}

/* Figma Key Item: 10px 점 + 12px 이름 */
export function Key({ items }: { items: { label: string; color?: string; kind?: "dot" | "dash" | "ring" }[] }) {
  return (
    <ul className="key">
      {items.map((it) => (
        <li key={it.label}>
          <i className={it.kind ?? "dot"} style={it.kind === "dash" || it.kind === "ring" ? { borderColor: it.color } : { background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/* ======================================================================
   KPI: Figma Cards (Type=Detailed 35:10260)
   Meta 12 회색 / 값 26 ExtraBold + 변화 배지 / 보조 16 회색 / 진행 막대(양 끝 숫자 12, 4px 막대)
   ====================================================================== */
interface Bar {
  left: string;
  right: string;
  from: number;
  to: number;
  mark?: number;
  tick?: number;
}
function KpiCard({ meta, value, badge, text, icon, color, bar }: { meta: string; value: ReactNode; badge?: { text: string; tone: Tone }; text: string; icon: IconName; color: string; bar: Bar }) {
  const c = (x: number) => `${Math.min(100, Math.max(0, x * 100))}%`;
  return (
    <section className="kpi-card" style={{ ["--kpi-c" as string]: color }}>
      <div className="kpi-top">
        <div className="kpi-text">
          <p className="kpi-meta">{meta}</p>
          <div className="kpi-value">
            <b className="num">{value}</b>
            {badge && <span className={`kbadge ${badge.tone}`}>{badge.text}</span>}
          </div>
        </div>
        <span className="kpi-ic" aria-hidden>
          <Icon name={icon} />
        </span>
      </div>
      <p className="kpi-sub">{text}</p>
      <div className="kpi-bar">
        <div className="kpi-bar-labels num">
          <span>{bar.left}</span>
          <span>{bar.right}</span>
        </div>
        <div className="kpi-track">
          <i style={{ left: c(Math.min(bar.from, bar.to)), width: c(Math.abs(bar.to - bar.from)) }} />
          {bar.tick !== undefined && <span className="kpi-tick" style={{ left: c(bar.tick) }} />}
          {bar.mark !== undefined && <em style={{ left: c(bar.mark) }} />}
        </div>
      </div>
    </section>
  );
}

export function KpiRow({ r }: { r: VariableResult }) {
  const st = r.stats;
  const unit = r.variable.unit;
  const tone = toneOf(st.verdict.status, st.verdict.direction, r.variable.higher_is);
  const arrow = st.verdict.direction === "increase" ? "▴" : st.verdict.direction === "decrease" ? "▾" : "–";
  const dir = { increase: "증가", decrease: "감소", flat: "변화 없음" }[st.verdict.direction];
  const [lo, hi] = st.ci_per_decade;
  const a = Math.min(lo, 0), b = Math.max(hi, 0), span = b - a || 1;
  const pos = (v: number) => (v - a) / span;
  const vs = r.series.map((p) => p.value);
  const vmin = Math.min(...vs), vmax = Math.max(...vs), vspan = vmax - vmin || 1;
  const pct = Math.abs(st.early.mean) > 1e-9 ? ((st.late.mean - st.early.mean) / Math.abs(st.early.mean)) * 100 : null;
  const total = r.end - r.start + 1;
  return (
    <div className="kpi-row">
      <KpiCard
        meta="10년당 변화"
        value={
          <>
            {signed(st.slope_per_decade)}
            <small>{unit}</small>
          </>
        }
        badge={{ text: `${arrow} ${dir}`, tone }}
        text={`95% 신뢰구간, ${st.method === "sen" ? "Sen" : "OLS"} 기울기`}
        icon="chart"
        color="var(--blue)"
        bar={{ left: signed(lo), right: signed(hi), from: pos(lo), to: pos(hi), mark: pos(st.slope_per_decade), tick: pos(0) }}
      />
      <KpiCard
        meta="추세 판정"
        value={st.verdict.label}
        text={`Mann-Kendall ${pText(st.mk.p)}`}
        icon="check"
        color="var(--orange)"
        bar={{ left: "p 0", right: "0.1", from: 0, to: Math.min(st.mk.p, 0.1) / 0.1, mark: Math.min(st.mk.p, 0.1) / 0.1, tick: 0.5 }}
      />
      <KpiCard
        meta="초기 → 최근 평균"
        value={
          <>
            {fmt(st.early.mean)} → {fmt(st.late.mean)}
            <small>{unit}</small>
          </>
        }
        badge={pct === null ? undefined : { text: `${pct >= 0 ? "▴" : "▾"} ${Math.abs(pct).toFixed(0)}%`, tone }}
        text={`${st.early.from}–${String(st.early.to).slice(2)} 대비 ${st.late.from}–${String(st.late.to).slice(2)}`}
        icon="arrow"
        color="var(--yellow)"
        bar={{ left: fmt(vmin), right: fmt(vmax), from: (st.early.mean - vmin) / vspan, to: (st.late.mean - vmin) / vspan, mark: (st.late.mean - vmin) / vspan }}
      />
      <KpiCard
        meta="분석 연수"
        value={
          <>
            {st.n}
            <small>년</small>
          </>
        }
        text={`${r.start}–${r.end}, ${r.variable.dataset}`}
        icon="calendar"
        color="var(--purple)"
        bar={{ left: "0", right: `${total}년`, from: 0, to: st.n / total }}
      />
    </div>
  );
}

/* ======================================================================
   연도별 추세: Figma Scatter Plot Graph (점 + 곡선, 테두리 격자, 축 이름)
   ====================================================================== */
function rowsOf(r: VariableResult) {
  // 추세선은 양 끝 점만 올 수 있어서 그 직선 위의 값으로 채움
  const t = r.trend.sen, a = t[0], b = t[t.length - 1];
  const sen = (y: number) => (a && b && b.year !== a.year ? a.value + ((b.value - a.value) * (y - a.year)) / (b.year - a.year) : undefined);
  const mine = new Map((r.overlay?.points ?? []).map((p) => [p.year, p.value]));
  return r.series.map((p) => ({ year: p.year, value: p.value, sen: sen(p.year), mine: mine.get(p.year) }));
}
const n2 = (v: number | undefined) => (v === undefined ? "" : String(Math.round(v * 100) / 100));

function downloadCsv(r: VariableResult, region: Region) {
  const head = ["연도", `${r.variable.name}${r.variable.unit ? ` (${r.variable.unit})` : ""}`, "Sen 추세값", ...(r.overlay ? [r.overlay.label] : [])];
  const lines = rowsOf(r).map((x) => [x.year, n2(x.value), n2(x.sen), ...(r.overlay ? [n2(x.mine)] : [])].join(","));
  // 엑셀에서 한글이 깨지지 않게 BOM
  const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${region.id}_${r.variable.id}_${r.start}-${r.end}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function TrendCard({ r, region }: { r: VariableResult; region: Region }) {
  const [view, setView] = useState("chart");
  const st = r.stats;
  const unit = r.variable.unit;
  const [lo, hi] = st.ci_per_decade;
  return (
    <ChartCard
      className="fcard-wide"
      meta={r.variable.name}
      title="연도별 값과 추세선"
      value={`${signed(st.slope_per_decade)}${unit} / 10년`}
      sub={`95% 신뢰구간 ${signed(lo)} ~ ${signed(hi)}${unit}, ${st.method === "sen" ? "Sen" : "OLS"} 기울기 기준`}
      action={{ icon: "download", label: "CSV 받기", onClick: () => downloadCsv(r, region) }}
      tabs={[
        { id: "chart", label: "그래프" },
        { id: "table", label: "표" },
      ]}
      tab={view}
      onTab={setView}
      body={{ meta: "판정", title: st.verdict.label, sub: `Mann-Kendall ${pText(st.mk.p)}, t-검정 ${pText(st.ols.p)}` }}
    >
      {view === "chart" ? (
        <TrendChart r={r} />
      ) : (
        <div className="frame-table">
          <table>
            <thead>
              <tr>
                <th scope="col">연도</th>
                <th scope="col">값{unit ? ` (${unit})` : ""}</th>
                <th scope="col">Sen 추세값</th>
                {r.overlay && <th scope="col">{r.overlay.label}</th>}
              </tr>
            </thead>
            <tbody>
              {rowsOf(r).map((x) => (
                <tr key={x.year} {...(x.year === st.leave_out.year ? { "data-peak": "" } : {})}>
                  <th scope="row">
                    {x.year}
                    {x.year === st.leave_out.year && <span className="chip-num">최대 이상치</span>}
                  </th>
                  <td>{n2(x.value)}</td>
                  <td>{n2(x.sen)}</td>
                  {r.overlay && <td>{n2(x.mine)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

/* ======================================================================
   산지별 10년당 변화: Figma Level 2 (가운데 기준 양쪽 막대, 초록/빨강 옅은 칸 + 진한 숫자)
   ====================================================================== */
export function Level2Card({ r, region, onRegion }: { r: VariableResult; region: Region; onRegion: (id: string) => void }) {
  const hiIs = r.variable.higher_is;
  const rows = [...r.regions].sort((x, y) => y.slope_per_decade - x.slope_per_decade);
  const max = Math.max(...rows.map((x) => Math.abs(x.slope_per_decade)), 1e-9);
  // 감소 쪽/증가 쪽이 생산자에게 좋은지 나쁜지
  const side = (dir: "dec" | "inc") => (hiIs === "neutral" ? "neu" : (dir === "inc") === (hiIs === "worse") ? "bad" : "good");
  const word = { good: "좋아짐", bad: "나빠짐", neu: "중립" } as const;
  return (
    <ChartCard meta="같은 변수·기간" title="산지별 10년당 변화" sub={`산지 ${rows.length}곳, 막대를 누르면 그 산지로`}>
      <div className="l2-key">
        <span>감소</span>
        <span>
          <b className={`l2-${side("dec")}`}>{word[side("dec")]}</b>/<b className={`l2-${side("inc")}`}>{word[side("inc")]}</b>
        </span>
        <span>증가</span>
      </div>
      <ul className="l2">
        {rows.map((x) => {
          const v = x.slope_per_decade;
          const w = `${(Math.abs(v) / max) * 50}%`;
          // 표시값이 0.0 이면 방향 없음
          const s = Math.round(v * 10) === 0 ? "neu" : v < 0 ? side("dec") : side("inc");
          return (
            <li key={x.region_id}>
              <button onClick={() => onRegion(x.region_id)} {...(x.region_id === region.id ? { "aria-current": "true" } : {})}>
                <span className="l2-name">{x.name}</span>
                <span className="l2-track">
                  <span className={`l2-bar l2-${s}`} style={v < 0 ? { right: "50%", width: w } : { left: "50%", width: w }}>
                    <span className="num">{signed(v)}</span>
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

/* ======================================================================
   해마다 값: Figma Heatmap (색 막대 범례 + 칸 격자). 행 = 10년 단위, 열 = 끝자리 연도
   ====================================================================== */
export function HeatmapGrid({ values, higherIs, unit }: { values: YearValue[]; higherIs: Variable["higher_is"]; unit: string }) {
  const byYear = new Map(values.map((p) => [p.year, p.value]));
  const vs = values.map((p) => p.value);
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const first = Math.floor(values[0].year / 10) * 10, last = Math.floor(values[values.length - 1].year / 10) * 10;
  const decades = Array.from({ length: (last - first) / 10 + 1 }, (_, i) => first + i * 10);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => fmt(lo + span * t));
  return (
    <div className="hm">
      <span className="hm-scale" style={{ background: heatGradient(higherIs) }} />
      <div className="hm-ticks num">
        {ticks.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <div className="hm-grid">
        {decades.map((d) => (
          <div className="hm-row" key={d}>
            <span className="hm-lab">{d}년대</span>
            {Array.from({ length: 10 }, (_, k) => {
              const y = d + k, v = byYear.get(y);
              return v === undefined ? (
                <span key={y} className="hm-cell empty" />
              ) : (
                <span key={y} className="hm-cell" style={{ background: scaleColor((v - lo) / span, higherIs) }} title={`${y}년 ${fmt(v)}${unit}`} />
              );
            })}
          </div>
        ))}
        <div className="hm-row hm-cols">
          <span className="hm-lab" />
          {Array.from({ length: 10 }, (_, k) => (
            <span key={k} className="num">
              {k}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeatmapCard({ r }: { r: VariableResult }) {
  const better = r.variable.higher_is === "better";
  return (
    <ChartCard meta={r.variable.name} title="해마다 값" sub={`칸 하나가 1년, ${better ? "초록일수록 불리" : "빨강일수록 불리"}`}>
      <HeatmapGrid values={r.series} higherIs={r.variable.higher_is} unit={r.variable.unit} />
    </ChartCard>
  );
}

/* ======================================================================
   산지 판정 분포: Figma Doughnut Chart (고리 + 퍼센트 + 오른쪽 범례)
   ====================================================================== */
export function DoughnutCard({ r }: { r: VariableResult }) {
  const order: Tone[] = ["bad", "mid", "good", "none"];
  const counts = order.map((t) => ({ t, n: r.regions.filter((x) => toneOf(x.status, x.direction, r.variable.higher_is) === t).length })).filter((x) => x.n > 0);
  const total = r.regions.length || 1;
  const R = 70, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <ChartCard meta="같은 변수·기간" title={`산지 ${r.regions.length}곳 판정`} sub="추세 방향과 유의성 기준">
      <div className="dn">
        <svg viewBox="0 0 200 200" className="dn-svg" role="img" aria-label={counts.map((c) => `${TONE_TEXT[c.t]} ${c.n}곳`).join(", ")}>
          {counts.map((c) => {
            const frac = c.n / total;
            const start = acc;
            acc += frac;
            const mid = (start + frac / 2) * 2 * Math.PI - Math.PI / 2;
            return (
              <g key={c.t}>
                <circle cx="100" cy="100" r={R} fill="none" strokeWidth="30" style={{ stroke: TONE_VAR[c.t] }} strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-start * C} transform="rotate(-90 100 100)" />
                {frac >= 0.08 && (
                  <text x={100 + Math.cos(mid) * R} y={100 + Math.sin(mid) * R + 4} textAnchor="middle" className="dn-pct">
                    {Math.round(frac * 100)}%
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <Key items={counts.map((c) => ({ label: `${TONE_TEXT[c.t]} ${c.n}곳`, color: TONE_VAR[c.t] }))} />
      </div>
    </ChartCard>
  );
}
