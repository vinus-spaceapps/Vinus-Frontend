import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { pText, signed } from "../lib/format";
import type { Region, Variable, VariableResult, YearValue } from "../lib/types";
import { heatGradient, scaleColor, TONE_TEXT, TONE_VAR, toneOf, type Tone } from "../tone";
import Icon, { type IconName } from "./Icon";
import TrendChart from "./TrendChart";

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

/* ---------- 공통: 카드 머리 (Figma Header: 제목 + 부제 + 오른쪽 아이콘 버튼) ---------- */
export function CardHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="card-head">
      <div className="card-titles">
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="card-tools">{children}</div>}
    </header>
  );
}

function CardMenu({ items }: { items: { label: string; icon: IconName; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("mousedown", away);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("mousedown", away);
      removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className="menu" ref={box}>
      <button className="icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label="더 보기" onClick={() => setOpen((o) => !o)}>
        <Icon name="dots" size={16} />
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                it.onClick();
                setOpen(false);
              }}
            >
              <Icon name={it.icon} size={16} />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- KPI 카드 (Figma Cards: 이름 / 값 + 변화 배지 / 보조 문구 / 진행 막대) ---------- */
interface Bar {
  left: string;
  right: string;
  from: number; // 0~1
  to: number; // 0~1
  mark?: number; // 0~1 점 추정치 등
  tick?: number; // 0~1 기준선
  tone?: Tone;
}
function KpiCard({ meta, value, badge, sub, icon, tint, bar }: { meta: string; value: ReactNode; badge?: { text: string; tone: Tone }; sub: string; icon: IconName; tint: string; bar: Bar }) {
  const c = (x: number) => `${Math.min(100, Math.max(0, x * 100))}%`;
  return (
    <section className={`kpi-card ${tint}`}>
      <div className="kpi-top">
        <div className="kpi-text">
          <p className="kpi-meta">{meta}</p>
          <div className="kpi-value">
            <b className="num">{value}</b>
            {badge && <span className={`delta ${badge.tone}`}>{badge.text}</span>}
          </div>
        </div>
        <span className="kpi-ic" aria-hidden>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <p className="kpi-sub">{sub}</p>
      <div className="kpi-bar">
        <div className="kpi-bar-labels num">
          <span>{bar.left}</span>
          <span>{bar.right}</span>
        </div>
        <div className="kpi-track">
          <i style={{ left: c(Math.min(bar.from, bar.to)), width: c(Math.abs(bar.to - bar.from)), ...(bar.tone ? { background: TONE_VAR[bar.tone] } : {}) }} />
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

  // 1) 10년당 변화: 신뢰구간을 막대로, 추정치를 점으로
  const [lo, hi] = st.ci_per_decade;
  const a = Math.min(lo, 0), b = Math.max(hi, 0), span = b - a || 1;
  const pos = (v: number) => (v - a) / span;

  // 2) 판정: p값을 0~0.1 눈금에, 0.05 기준선
  const pMax = 0.1;

  // 3) 초기 → 최근: 관측 범위 안에서 어디서 어디로 옮겨 갔나
  const vs = r.series.map((p) => p.value);
  const vmin = Math.min(...vs), vmax = Math.max(...vs), vspan = vmax - vmin || 1;
  const pct = Math.abs(st.early.mean) > 1e-9 ? ((st.late.mean - st.early.mean) / Math.abs(st.early.mean)) * 100 : null;

  // 4) 분석 연수: 기간 대비 자료가 있는 해
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
        sub={`95% 신뢰구간, ${st.method === "sen" ? "Sen" : "OLS"} 기울기`}
        icon="chart"
        tint="t-purple"
        bar={{ left: signed(lo), right: signed(hi), from: pos(lo), to: pos(hi), mark: pos(st.slope_per_decade), tick: pos(0), tone }}
      />
      <KpiCard
        meta="추세 판정"
        value={st.verdict.label}
        sub={`Mann-Kendall ${pText(st.mk.p)}, 기준 0.05`}
        icon="check"
        tint="t-blue"
        bar={{ left: "p 0", right: "0.1 이상", from: 0, to: Math.min(st.mk.p, pMax) / pMax, mark: Math.min(st.mk.p, pMax) / pMax, tick: 0.5, tone: st.mk.p < 0.05 ? "good" : "none" }}
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
        sub={`${st.early.from}–${String(st.early.to).slice(2)} 대비 ${st.late.from}–${String(st.late.to).slice(2)}`}
        icon="arrow"
        tint="t-orange"
        bar={{ left: `최저 ${fmt(vmin)}`, right: `최고 ${fmt(vmax)}`, from: (st.early.mean - vmin) / vspan, to: (st.late.mean - vmin) / vspan, mark: (st.late.mean - vmin) / vspan, tone }}
      />
      <KpiCard
        meta="분석 연수"
        value={
          <>
            {st.n}
            <small>년</small>
          </>
        }
        sub={`${r.start}–${r.end}, ${r.variable.dataset}`}
        icon="calendar"
        tint="t-yellow"
        bar={{ left: "0", right: `${total}년`, from: 0, to: st.n / total }}
      />
    </div>
  );
}

/* ---------- 산지별 10년당 변화 (Figma Histogram → 가로 막대, 0 기준선) ---------- */
export function RegionBarsCard({ r, region, onRegion }: { r: VariableResult; region: Region; onRegion: (id: string) => void }) {
  const hi = r.variable.higher_is;
  const rows = [...r.regions].sort((x, y) => y.slope_per_decade - x.slope_per_decade);
  const vals = rows.map((x) => x.slope_per_decade);
  const lo = Math.min(0, ...vals), top = Math.max(0, ...vals), span = top - lo || 1;
  const xp = (v: number) => ((v - lo) / span) * 100;
  return (
    <section className="card dash-card">
      <CardHead title="산지별 10년당 변화" sub={`같은 변수·기간, 산지 ${rows.length}곳`} />
      <ul className="key" aria-label="막대 색">
        {(["bad", "mid", "good", "none"] as const).map((t) => (
          <li key={t}>
            <i style={{ background: TONE_VAR[t] }} />
            {TONE_TEXT[t]}
          </li>
        ))}
      </ul>
      <ul className="hbars">
        {rows.map((x) => {
          const v = x.slope_per_decade;
          return (
            <li key={x.region_id}>
              <button onClick={() => onRegion(x.region_id)} {...(x.region_id === region.id ? { "aria-current": "true" } : {})}>
                <span className="nm">{x.name}</span>
                <span className="hb-track" aria-hidden>
                  <span className="hb-zero" style={{ left: `${xp(0)}%` }} />
                  <span className="hb-bar" style={{ left: `${Math.min(xp(0), xp(v))}%`, width: `${Math.max(Math.abs(xp(v) - xp(0)), 0.8)}%`, background: TONE_VAR[toneOf(x.status, x.direction, hi)] }} />
                </span>
                <span className="num">{signed(v)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- 기간별 흐름: 굵기 = 값, 색 = 값 크기 (Figma 히트맵 색 막대 범례) ---------- */
type Pt = [number, number];
// Catmull-Rom → 베지어. 시작점 M 없이 C 구간만 돌려줌
function curve(pts: Pt[]): string {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

export interface StreamMark {
  at: number; // 0~1 가로 위치
  top: string;
  bottom: string;
}

// 해마다 값은 들쭉날쭉해서 흐름이 보이도록 3년 중심 이동평균
const smooth3 = (vs: YearValue[]) => vs.map((p, i) => ({ year: p.year, value: (vs[Math.max(0, i - 1)].value + p.value + vs[Math.min(vs.length - 1, i + 1)].value) / 3 }));

export function StreamBand({ values: raw, higherIs, marks = [], height = 190 }: { values: YearValue[]; higherIs: Variable["higher_is"]; marks?: StreamMark[]; height?: number }) {
  const gid = useId().replace(/:/g, "");
  const values = smooth3(raw);
  const W = 600, H = 200, mid = H / 2, minH = 5, maxH = 46;
  const vs = values.map((p) => p.value);
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const n = values.length;
  const norm = (v: number) => (v - lo) / span;
  const band = (k: number) => {
    const top: Pt[] = values.map((p, i) => [(i / (n - 1)) * W, mid - (minH + norm(p.value) * (maxH - minH)) * k]);
    const bot: Pt[] = [...top].reverse().map(([x, y]) => [x, mid + (mid - y)]);
    return `M${top[0][0]},${top[0][1]}${curve(top)} L${bot[0][0]},${bot[0][1]}${curve(bot)} Z`;
  };
  if (n < 2) return null;
  return (
    <div className="stream" style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
            {values.map((p, i) => (
              <stop key={p.year} offset={i / (n - 1)} stopColor={scaleColor(norm(p.value), higherIs)} />
            ))}
          </linearGradient>
        </defs>
        <path d={band(1.9)} fill={`url(#${gid})`} opacity={0.18} />
        <path d={band(1.4)} fill={`url(#${gid})`} opacity={0.35} />
        <path d={band(1)} fill={`url(#${gid})`} />
      </svg>
      {marks.map((m) => (
        <div key={m.bottom} className="stream-mark" style={{ left: `${m.at * 100}%` }}>
          <span className="chip-num">{m.top}</span>
          <span className="chip-num">{m.bottom}</span>
        </div>
      ))}
    </div>
  );
}

export function FlowCard({ r }: { r: VariableResult }) {
  const st = r.stats;
  const unit = r.variable.unit;
  const first = r.series[0]?.year ?? r.start, last = r.series[r.series.length - 1]?.year ?? r.end;
  const at = (y: number) => (last === first ? 0.5 : (y - first) / (last - first));
  const mean = r.series.reduce((s, p) => s + p.value, 0) / (r.series.length || 1);
  const vs = r.series.map((p) => p.value);
  const yy = (a: number, b: number) => `${a}–${String(b).slice(2)}`;
  const better = r.variable.higher_is === "better";
  return (
    <section className="card dash-card">
      <CardHead title="기간별 흐름" sub="3년 이동평균, 굵기와 색이 값" />
      <div className="heat-scale">
        <span className="heat-bar" style={{ background: heatGradient(r.variable.higher_is) }} />
        <div className="heat-ticks num">
          <span>
            {fmt(Math.min(...vs))}
            {unit} {better ? "불리" : "유리"}
          </span>
          <span>
            {fmt(Math.max(...vs))}
            {unit} {better ? "유리" : "불리"}
          </span>
        </div>
      </div>
      <StreamBand
        values={r.series}
        higherIs={r.variable.higher_is}
        marks={[
          { at: at((st.early.from + st.early.to) / 2), top: fmt(st.early.mean), bottom: yy(st.early.from, st.early.to) },
          { at: 0.5, top: fmt(mean), bottom: "전체 평균" },
          { at: at((st.late.from + st.late.to) / 2), top: fmt(st.late.mean), bottom: yy(st.late.from, st.late.to) },
        ]}
      />
    </section>
  );
}

/* ---------- 연도별 추세: 그래프 ↔ 표, CSV 받기 ---------- */
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
  const [table, setTable] = useState(false);
  const unit = r.variable.unit;
  return (
    <section className="card dash-card trend-card">
      <CardHead title="연도별 추세" sub={`${r.variable.name}${unit ? ` (${unit})` : ""}, ${r.start}–${r.end}`}>
        <CardMenu
          items={[
            table ? { label: "그래프로 보기", icon: "chart", onClick: () => setTable(false) } : { label: "표로 보기", icon: "table", onClick: () => setTable(true) },
            { label: "CSV 받기", icon: "download", onClick: () => downloadCsv(r, region) },
          ]}
        />
      </CardHead>
      {table ? (
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
                <tr key={x.year} {...(x.year === r.stats.leave_out.year ? { "data-peak": "" } : {})}>
                  <th scope="row">
                    {x.year}
                    {x.year === r.stats.leave_out.year && <span className="chip-num">최대 이상치</span>}
                  </th>
                  <td>{n2(x.value)}</td>
                  <td>{n2(x.sen)}</td>
                  {r.overlay && <td>{n2(x.mine)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <TrendChart r={r} />
      )}
    </section>
  );
}
