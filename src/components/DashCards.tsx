import { useState, type ReactNode } from "react";
import { fmtNum, lineAt, pText, signed } from "../lib/format";
import type { Region, Validation, Variable, VariableResult, YearValue } from "../lib/types";
import { HEAT_LEVELS, TONE_TEXT, TONE_VAR, toneOf, type Tone } from "../tone";
import Icon, { type IconName } from "./Icon";
import TrendChart, { asBars } from "./TrendChart";

/* ======================================================================
   Figma "Full charts components" 의 card 뼈대:
   card(흰 바탕, 라운드 20) = card-header(패딩 25, 제목 + 오른쪽 둥근 아이콘 40) + card-body + card-footer
   ====================================================================== */
export function Card({
  title,
  desc,
  icon,
  tint,
  action,
  footer,
  children,
  className = "",
}: {
  title: ReactNode;
  desc?: ReactNode;
  icon?: IconName; // 제목 앞 아이콘 (Doughnut 카드처럼)
  tint?: boolean; // 머리 칸 옅은 바탕 (#FCFCFC)
  action?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <header className={`card-head ${tint ? "tint" : ""}`}>
        <div className="card-titles">
          <h2 className="card-title">
            {icon && <Icon name={icon} size={24} />}
            {title}
          </h2>
          {desc && <p className="card-desc">{desc}</p>}
        </div>
        {action}
      </header>
      {children && <div className="card-body">{children}</div>}
      {footer && <footer className="card-foot">{footer}</footer>}
    </section>
  );
}

// 둥근 아이콘 버튼 (Icons contained=true: 40, #F2F2F2)
export function IconBtn({ icon, label, onClick, pressed }: { icon: IconName; label: string; onClick?: () => void; pressed?: boolean }) {
  return (
    <button className="ic" onClick={onClick} aria-label={label} title={label} {...(pressed !== undefined ? { "aria-pressed": pressed } : {})}>
      <Icon name={icon} size={24} />
    </button>
  );
}

// 알약 칩 줄 (Statistic 카드의 24h·1d·3d…): 고른 것만 진한 바탕
export function Seg<T extends string>({ options, value, onChange, label }: { options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// 범례: Doughnut 카드의 알약 견본(27×13) + 이름
export function Legend({ items }: { items: { label: ReactNode; color: string; kind?: "line" | "dash" }[] }) {
  return (
    <ul className="legend">
      {items.map((it, i) => (
        <li key={i}>
          <i className={it.kind ?? ""} style={{ background: it.kind ? undefined : it.color, borderColor: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

// Avatars: 사진 대신 산지 이름 첫 글자. ring = Outline=true
export function Avatar({ name, size = 60, ring }: { name: string; size?: number; ring?: boolean }) {
  return (
    <span className={`avatar ${ring ? "ring" : ""}`} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {name.trim().charAt(0)}
    </span>
  );
}

// media: 아바타 + 이름(20) + 보조(13 회색) + 오른쪽 옵션
export function Media({ name, sub, option, size = 60 }: { name: string; sub: ReactNode; option?: ReactNode; size?: number }) {
  return (
    <div className="media">
      <Avatar name={name} size={size} />
      <div className="media-text">
        <b>{name}</b>
        <span>{sub}</span>
      </div>
      {option}
    </div>
  );
}

const toneOfResult = (r: VariableResult): Tone => toneOf(r.stats.verdict.status, r.stats.verdict.direction, r.variable.higher_is);

/* ======================================================================
   핵심 숫자 4개 (Collection·$890.93 카드: 제목 + 아이콘 / 큰 숫자 36 / 보조 / 작은 그래픽)
   ====================================================================== */
function Kpi({ title, icon, value, unit, badge, sub, children }: { title: string; icon: IconName; value: ReactNode; unit?: string; badge?: ReactNode; sub: ReactNode; children: ReactNode }) {
  return (
    <section className="card kpi">
      <div className="kpi-head">
        <span className="kpi-title">{title}</span>
        <span className="ic static" aria-hidden>
          <Icon name={icon} size={24} />
        </span>
      </div>
      <p className="kpi-value">
        <b className="num">{value}</b>
        {unit && <small>{unit}</small>}
        {badge}
      </p>
      <p className="kpi-sub">{sub}</p>
      <div className="kpi-viz">{children}</div>
    </section>
  );
}

export function KpiRow({ r }: { r: VariableResult }) {
  const st = r.stats;
  const unit = r.variable.unit;
  const [lo, hi] = st.ci_per_decade;
  const tone = toneOfResult(r);
  // 신뢰구간 막대: 0 을 꼭 포함하는 범위에서 구간·추정값 위치
  const dLo = Math.min(lo, 0), dHi = Math.max(hi, 0);
  const pad = (dHi - dLo) * 0.08 || 1;
  const pos = (x: number) => `${((x - (dLo - pad)) / (dHi - dLo + 2 * pad)) * 100}%`;
  const vals = r.series.map((p) => p.value);
  const sMin = Math.min(...vals), sMax = Math.max(...vals);
  const rel = (x: number) => `${Math.max(4, ((x - sMin) / (sMax - sMin || 1)) * 100)}%`;
  const arrow = st.verdict.direction === "increase" ? "▲" : st.verdict.direction === "decrease" ? "▼" : "–";
  const tests = [
    { label: "Mann-Kendall", p: st.mk.p },
    { label: "t-검정", p: st.ols.p },
    { label: "자기상관 보정", p: st.ols.p_ar1 },
  ];
  const have = new Set(r.series.map((p) => p.year));
  const years = Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i);

  return (
    <div className="kpi-row">
      <Kpi
        title="10년당 변화"
        icon="bars"
        value={signed(st.slope_per_decade)}
        unit={unit}
        badge={
          <span className={`tag ${tone}`}>
            {arrow} {TONE_TEXT[tone]}
          </span>
        }
        sub={`95% 신뢰구간 ${signed(lo)} ~ ${signed(hi)}`}
      >
        <div className="ci" aria-label={`신뢰구간 ${signed(lo)}에서 ${signed(hi)}`}>
          <span className="ci-range" style={{ left: pos(lo), width: `calc(${pos(hi)} - ${pos(lo)})` }} />
          <span className="ci-zero" style={{ left: pos(0) }} />
          <span className="ci-dot" style={{ left: pos(st.slope_per_decade) }} />
        </div>
      </Kpi>

      <Kpi title="추세 판정" icon="filter" value={st.verdict.label} sub="세 검정 중 p < 0.05 인 것이 진하게">
        <div className="pills">
          {tests.map((t) => (
            <span key={t.label} className={`pill-sm ${t.p < 0.05 ? "on" : ""}`} title={pText(t.p)}>
              {t.label} {t.p < 0.001 ? "<0.001" : t.p.toFixed(3)}
            </span>
          ))}
        </div>
      </Kpi>

      <Kpi
        title="초기 → 최근 평균"
        icon="sort"
        value={`${fmtNum(st.early.mean)} → ${fmtNum(st.late.mean)}`}
        unit={unit}
        sub={`${st.early.from}–${String(st.early.to).slice(2)} 대비 ${st.late.from}–${String(st.late.to).slice(2)}`}
      >
        {/* Horizontal bar chart with border radius: 옅은 칸 = 이 기간 최솟값~최댓값 */}
        <div className="hbars">
          <span className="hbar">
            <i style={{ width: rel(st.early.mean), background: "var(--w6)" }} />
          </span>
          <span className="hbar">
            <i style={{ width: rel(st.late.mean) }} />
          </span>
        </div>
      </Kpi>

      <Kpi title="분석 연수" icon="calendar" value={st.n} unit="년" sub={`${r.start}–${r.end}, ${r.variable.dataset}`}>
        <div className="minibars" aria-label={`자료 있는 해 ${st.n}개`}>
          {years.map((y) => (
            <i key={y} title={String(y)} style={{ height: have.has(y) ? "100%" : "30%", background: have.has(y) ? undefined : "var(--bar-off)" }} />
          ))}
        </div>
      </Kpi>
    </div>
  );
}

/* ======================================================================
   연도별 값 + 추세선 ($890.93 넓은 카드: 큰 값 + 차트 버튼 / 둥근 막대, 최고값 점선 MAX)
   ====================================================================== */
function downloadCsv(r: VariableResult, region: Region) {
  const rows = ["year,value,sen_trend", ...r.series.map((p) => `${p.year},${p.value},${lineAt(r.trend.sen, p.year)?.toFixed(3) ?? ""}`)];
  const url = URL.createObjectURL(new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${region.id}_${r.variable.id}_${r.start}-${r.end}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function TrendCard({ r, region }: { r: VariableResult; region: Region }) {
  const [table, setTable] = useState(false);
  const st = r.stats;
  const unit = r.variable.unit;
  const peak = st.extremes[0]?.year;
  return (
    <section className="card span-2 trend-card">
      <header className="card-head">
        <div className="card-titles">
          <p className="card-meta">
            {r.variable.name} · {r.variable.stage}
          </p>
          <p className="big num">
            {signed(st.slope_per_decade)}
            {unit} <small>/ 10년</small>
          </p>
          <p className="card-desc">
            {st.verdict.label} · Mann-Kendall {pText(st.mk.p)} · {st.method === "sen" ? "Sen" : "OLS"} 기울기
          </p>
        </div>
        <div className="head-actions">
          <button className="chart-btn" aria-pressed={table} onClick={() => setTable((t) => !t)} aria-label={table ? "그래프로 보기" : "표로 보기"} title={table ? "그래프로 보기" : "표로 보기"}>
            <Icon name={table ? "bars" : "menu"} size={24} />
          </button>
          <IconBtn icon="download" label="CSV 내려받기" onClick={() => downloadCsv(r, region)} />
        </div>
      </header>
      <div className="card-body">
        {table ? (
          <div className="frame-table" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">연도</th>
                  <th scope="col">값 ({unit})</th>
                  <th scope="col">Sen 추세</th>
                </tr>
              </thead>
              <tbody>
                {r.series.map((p) => (
                  <tr key={p.year} {...(p.year === peak ? { "data-peak": "" } : {})}>
                    <th scope="row">
                      {p.year}
                      {p.year === peak && <span className="pill-sm on">최대 이상치</span>}
                    </th>
                    <td>{fmtNum(p.value, 2)}</td>
                    <td>{fmtNum(lineAt(r.trend.sen, p.year) ?? NaN, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <TrendChart r={r} />
        )}
      </div>
      <footer className="card-foot row">
        <Legend
          items={[
            ...(asBars(r)
              ? [
                  { label: "해마다 값", color: "var(--bar-off)" },
                  { label: "가장 큰 해", color: "var(--w3)" },
                ]
              : [{ label: "해마다 값", color: "var(--w3)", kind: "line" as const }]),
            { label: "Sen 추세", color: "var(--text)", kind: "line" },
            { label: "OLS 추세", color: "var(--muted)", kind: "dash" },
            ...(r.overlay ? [{ label: r.overlay.label, color: "var(--good)", kind: "line" as const }] : []),
          ]}
        />
      </footer>
    </section>
  );
}

/* ======================================================================
   산지별 10년당 변화 (Horizontal bar chart with border radius: 옅은 알약 칸 + 진한 알약 막대)
   가운데 0 기준으로 왼쪽 감소 · 오른쪽 증가
   ====================================================================== */
export function RegionBarsCard({ r, region, onRegion }: { r: VariableResult; region: Region; onRegion: (id: string) => void }) {
  const rows = [...r.regions].sort((a, b) => b.slope_per_decade - a.slope_per_decade);
  const max = Math.max(...rows.map((x) => Math.abs(x.slope_per_decade)), 1e-9);
  const me = r.regions.find((x) => x.region_id === region.id);
  const hiIs = r.variable.higher_is;
  return (
    <Card title="산지별 10년당 변화" desc={`같은 지표·기간, ${rows.length}곳. 줄을 누르면 그 산지로`}>
      {me && <Media name={region.name} sub={region.country} option={<span className="pill dark">{me.label}</span>} />}
      <ul className="rbars">
        {rows.map((x) => {
          const v = x.slope_per_decade;
          const w = `${(Math.abs(v) / max) * 50}%`;
          const tone = toneOf(x.status, x.direction, hiIs);
          return (
            <li key={x.region_id}>
              <button onClick={() => onRegion(x.region_id)} {...(x.region_id === region.id ? { "aria-current": "true" } : {})} title={`${x.name}: ${x.label}`}>
                <span className="rb-name">{x.name.replace(/\s*\(.*\)$/, "")}</span>
                <span className="rb-track">
                  <i style={{ width: w, [v < 0 ? "right" : "left"]: "50%", background: TONE_VAR[tone] }} />
                </span>
                <span className="rb-val num">{signed(v)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <Legend items={(["bad", "good", "mid", "none"] as const).map((t) => ({ label: TONE_TEXT[t], color: TONE_VAR[t] }))} />
    </Card>
  );
}

/* ======================================================================
   해마다 값 (Sales per employee 의 contributions 칸: 4단계 Less → More)
   행 = 10년 단위, 열 = 끝자리 연도
   ====================================================================== */
export function HeatGrid({ values, unit }: { values: YearValue[]; unit: string }) {
  const by = new Map(values.map((p) => [p.year, p.value]));
  const sorted = values.map((p) => p.value).sort((a, b) => a - b);
  const q = (f: number) => sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))];
  const cuts = [q(0.25), q(0.5), q(0.75)];
  const lvl = (v: number) => cuts.filter((c) => v >= c).length;
  const ys = values.map((p) => p.year);
  const decades: number[] = [];
  for (let d = Math.floor(Math.min(...ys) / 10) * 10; d <= Math.max(...ys); d += 10) decades.push(d);
  const cols = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div className="hm">
      <div className="hm-row hm-cols" aria-hidden>
        <span />
        {cols.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
      {decades.map((d) => (
        <div className="hm-row" key={d}>
          <span className="hm-lab">{d}년대</span>
          {cols.map((c) => {
            const y = d + c;
            const v = by.get(y);
            return v === undefined ? (
              <i key={y} className="hm-cell none" />
            ) : (
              <i key={y} className="hm-cell" style={{ background: HEAT_LEVELS[lvl(v)] }} title={`${y}년 ${fmtNum(v)}${unit}`} />
            );
          })}
        </div>
      ))}
      <div className="hm-key">
        <span className="muted">칸 하나 = 1년</span>
        <span className="hm-scale">
          적음
          {HEAT_LEVELS.map((c) => (
            <i key={c} style={{ background: c }} />
          ))}
          많음
        </span>
      </div>
    </div>
  );
}

export function HeatmapCard({ r }: { r: VariableResult }) {
  return (
    <Card title="해마다 값" desc={`${r.variable.name}. 진할수록 값이 큰 해 (4분위)`}>
      <HeatGrid values={r.series} unit={r.variable.unit} />
    </Card>
  );
}

/* ======================================================================
   산지 판정 분포 (Doughnut: 옅은 머리 칸 + 아이콘 제목, 알약 범례, 고리 + 가운데 %, 아래 media)
   ====================================================================== */
export function DoughnutCard({ r, region }: { r: VariableResult; region: Region }) {
  const order: Tone[] = ["bad", "good", "mid", "none"];
  const counts = order.map((t) => r.regions.filter((x) => toneOf(x.status, x.direction, r.variable.higher_is) === t).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const R = 86, C = 2 * Math.PI * R;
  let acc = 0;
  const sig = r.regions.filter((x) => x.status === "significant").length;
  const me = r.regions.find((x) => x.region_id === region.id);
  return (
    <Card
      tint
      icon="doughnut"
      title={`산지 ${r.regions.length}곳 판정`}
      desc="같은 지표·기간에서 추세 방향과 유의성"
      footer={me && <Media name={region.name} sub="지금 보는 산지" option={<span className="pill dark">{me.label}</span>} />}
    >
      <Legend items={order.map((t, i) => ({ label: `${TONE_TEXT[t]} ${counts[i]}`, color: TONE_VAR[t] })).filter((_, i) => counts[i] > 0)} />
      <div className="dn">
        <svg viewBox="0 0 240 240" role="img" aria-label={order.map((t, i) => `${TONE_TEXT[t]} ${counts[i]}곳`).join(", ")}>
          <circle cx="120" cy="120" r={R} fill="none" stroke="var(--fill)" strokeWidth="40" />
          {order.map((t, i) => {
            if (!counts[i]) return null;
            const len = (counts[i] / total) * C;
            const el = (
              <circle
                key={t}
                cx="120"
                cy="120"
                r={R}
                fill="none"
                stroke={TONE_VAR[t]}
                strokeWidth="40"
                strokeDasharray={`${Math.max(len - 3, 0.1)} ${C}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 120 120)"
              />
            );
            acc += len;
            return el;
          })}
          <text x="120" y="118" textAnchor="middle" className="dn-pct">
            {Math.round((sig / total) * 100)}%
          </text>
          <text x="120" y="142" textAnchor="middle" className="dn-sub">
            유의함
          </text>
        </svg>
      </div>
    </Card>
  );
}

/* ======================================================================
   관측소·위성 검증 (Browser market shares 의 겹친 고리 + 알약 범례)
   ====================================================================== */
function Ring({ value, r, color }: { value: number; r: number; color: string }) {
  const C = 2 * Math.PI * r;
  return (
    <>
      <circle cx="90" cy="90" r={r} fill="none" stroke="var(--fill)" strokeWidth="14" />
      <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14" strokeLinecap="round" strokeDasharray={`${Math.max(0, value) * C} ${C}`} transform="rotate(-90 90 90)" />
    </>
  );
}

export function ValidationCard({ v, variable }: { v: Validation; variable: Variable }) {
  const st = v.station;
  const m = v.modis;
  const sv = variable.station_var;
  const c = (x: number) => (x > 0 ? `+${x.toFixed(2)}` : x.toFixed(2));
  // 가운데 숫자: 이 지표가 쓰는 기온 쪽 상관계수 (평균기온·기온 아님이면 최고기온)
  const useMin = sv === "tmin";
  return (
    <Card title="관측소·위성 검증" desc="격자(약 50km) 값이 근처 지상 관측소·1km 위성과 얼마나 맞는지">
      {st && (
        <div className="val">
          <svg viewBox="0 0 180 180" role="img" aria-label={`최고기온 상관 ${st.tmax_corr.toFixed(2)}, 최저기온 상관 ${st.tmin_corr.toFixed(2)}`}>
            <Ring value={st.tmax_corr} r={74} color="var(--w3)" />
            <Ring value={st.tmin_corr} r={54} color="var(--w5)" />
            <text x="90" y="94" textAnchor="middle" className="dn-pct">
              {(useMin ? st.tmin_corr : st.tmax_corr).toFixed(2)}
            </text>
            <text x="90" y="116" textAnchor="middle" className="dn-sub">
              {useMin ? "최저기온 r" : "최고기온 r"}
            </text>
          </svg>
          <Legend
            items={[
              { label: `최고기온 r ${st.tmax_corr.toFixed(2)} · 오차 ${c(st.tmax_bias)}°C`, color: "var(--w3)" },
              { label: `최저기온 r ${st.tmin_corr.toFixed(2)} · 오차 ${c(st.tmin_bias)}°C`, color: "var(--w5)" },
            ]}
          />
        </div>
      )}
      {m && (
        <p className="val-modis">
          <b className="num">{m.pixel_spread_mean.toFixed(1)}°C</b>
          <span>1km 위성(MODIS)으로 보면 같은 격자 안에서도 밤 지표면 온도가 평균 이만큼 차이 남 (최대 {m.pixel_spread_max.toFixed(1)}°C)</span>
        </p>
      )}
      <p className="card-note">
        {st ? `관측소 ${st.id}, ${st.days.toLocaleString()}일 비교. ` : "근처 지상 관측소 비교 자료 없음. "}
        {sv ? `이 지표는 ${sv === "tmin" ? "최저기온" : sv === "tmax" ? "최고기온" : "평균기온"} 기반.` : "이 지표는 기온 기반이 아니라 참고용."}
      </p>
    </Card>
  );
}
