import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { signed } from "../lib/format";
import type { Region, Variable, VariableResult, YearValue } from "../lib/types";
import { scaleColor, TONE_VAR, toneOf } from "../tone";
import Icon, { type IconName } from "./Icon";
import TrendChart from "./TrendChart";

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

/* ---------- 공통: 카드 머리 + ⋮ 메뉴 ---------- */
export function CardHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="card-head">
      <h2>{title}</h2>
      {children && <div className="card-tools">{children}</div>}
    </header>
  );
}

export function PeriodPill({ start, end }: { start: number; end: number }) {
  return (
    <span className="pill">
      <Icon name="calendar" size={14} />
      {start}–{end}
    </span>
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
        <Icon name="dots" />
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

/* ---------- 1. 산지별 10년당 변화: 게이지 + 점선 목록 ---------- */
function Gauge({ fraction, higherIs, children }: { fraction: number; higherIs: Variable["higher_is"]; children: ReactNode }) {
  const gid = useId().replace(/:/g, "");
  // 270° 열린 호 (아래가 비어 있음). pathLength=100 이라 대시 길이 = 퍼센트
  const d = "M 43.4 156.6 A 80 80 0 1 1 156.6 156.6";
  const f = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
  return (
    <div className="gauge">
      <svg viewBox="0 0 200 200" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={scaleColor(0, higherIs)} />
            <stop offset=".5" stopColor={scaleColor(0.5, higherIs)} />
            <stop offset="1" stopColor={scaleColor(1, higherIs)} />
          </linearGradient>
        </defs>
        <path d={d} pathLength={100} className="gauge-track" />
        <path d={d} pathLength={100} className="gauge-fill" stroke={`url(#${gid})`} style={{ strokeDashoffset: 100 - f }} />
      </svg>
      <div className="gauge-c">{children}</div>
    </div>
  );
}

export function RegionTrendCard({ r, region, onRegion }: { r: VariableResult; region: Region; onRegion: (id: string) => void }) {
  const hi = r.variable.higher_is;
  const rows = [...r.regions].sort((a, b) => b.slope_per_decade - a.slope_per_decade);
  const vals = rows.map((x) => x.slope_per_decade);
  const min = Math.min(...vals), max = Math.max(...vals);
  const me = r.stats.slope_per_decade;
  const rank = rows.findIndex((x) => x.region_id === region.id) + 1;
  return (
    <section className="card dash-card">
      <CardHead title="산지별 10년당 변화">
        <PeriodPill start={r.start} end={r.end} />
      </CardHead>
      <div className="rt-body">
        <Gauge fraction={max === min ? 0.5 : (me - min) / (max - min)} higherIs={hi}>
          <b className="num">
            {signed(me)}
            <small>{r.variable.unit}</small>
          </b>
          <span>
            {rows.length}곳 중 {rank}번째로 큼
          </span>
        </Gauge>
        <ul className="leader-list">
          {rows.map((x) => (
            <li key={x.region_id}>
              <button onClick={() => onRegion(x.region_id)} {...(x.region_id === region.id ? { "aria-current": "true" } : {})}>
                <i style={{ background: TONE_VAR[toneOf(x.status, x.direction, hi)] }} />
                <span className="nm">{x.name}</span>
                <span className="leader" aria-hidden />
                <span className="num">{signed(x.slope_per_decade)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 2. 기간별 흐름: 굵기 = 값, 색 = 값 크기 ---------- */
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
        <path d={band(1.9)} fill={`url(#${gid})`} opacity={0.16} />
        <path d={band(1.4)} fill={`url(#${gid})`} opacity={0.32} />
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
  const pct = Math.abs(st.early.mean) > 1e-9 ? ((st.late.mean - st.early.mean) / Math.abs(st.early.mean)) * 100 : null;
  const yy = (a: number, b: number) => `${a}–${String(b).slice(2)}`;
  return (
    <section className="card dash-card">
      <CardHead title="기간별 흐름" />
      <dl className="trio">
        <div>
          <dt>초기 평균</dt>
          <dd className="num">
            {fmt(st.early.mean)}
            <small>{unit}</small>
          </dd>
        </div>
        <div>
          <dt>최근 평균</dt>
          <dd className="num">
            {fmt(st.late.mean)}
            <small>{unit}</small>
          </dd>
        </div>
        <div>
          <dt>변화</dt>
          <dd className="num">{pct === null ? "–" : `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`}</dd>
        </div>
      </dl>
      <StreamBand
        values={r.series}
        higherIs={r.variable.higher_is}
        marks={[
          { at: at((st.early.from + st.early.to) / 2), top: fmt(st.early.mean), bottom: yy(st.early.from, st.early.to) },
          { at: 0.5, top: fmt(mean), bottom: "전체 평균" },
          { at: at((st.late.from + st.late.to) / 2), top: fmt(st.late.mean), bottom: yy(st.late.from, st.late.to) },
        ]}
      />
      <p className="card-note">띠 굵기와 색: 3년 이동평균 값 (클수록 굵고, 생산자에게 불리한 쪽일수록 붉게)</p>
    </section>
  );
}

/* ---------- 3. 연도별 추세: 그래프 ↔ 표, CSV 받기 ---------- */
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
    <section className="card dash-card">
      <CardHead title="연도별 추세">
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
