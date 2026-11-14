import { useState } from "react";
import { pText, signed } from "../lib/format";
import type { Region, VariableResult } from "../lib/types";
import RegionMap from "./RegionMap";
import TrendChart from "./TrendChart";

interface Props {
  r: VariableResult;
  region: Region;
  regions: Region[];
  onRegion: (id: string) => void;
}

type View = "chart" | "map" | "table";
const VIEWS: { id: View; label: string }[] = [
  { id: "chart", label: "그래프" },
  { id: "map", label: "지도" },
  { id: "table", label: "표" },
];

// 제목은 결론 한 줄 (OWID 방식): "수확기 연기 노출일수, 10년에 4.0일씩 증가"
function claim(r: VariableResult): string {
  const st = r.stats;
  const name = r.variable.name;
  if (st.verdict.direction === "flat") return `${name}, 뚜렷한 변화 없음`;
  const word = st.verdict.direction === "increase" ? "증가" : "감소";
  const tail = st.verdict.status === "significant" ? "" : st.verdict.status === "mixed" ? " (검정 엇갈림)" : " (유의하지 않음)";
  return `${name}, 10년에 ${Math.abs(st.slope_per_decade).toFixed(1)}${r.variable.unit}씩 ${word}${tail}`;
}

// 연도별 값 표와 CSV 가 같은 행을 씀
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

export default function ResultFrame({ r, region, regions, onRegion }: Props) {
  const [view, setView] = useState<View>("chart");
  const st = r.stats;
  const unit = r.variable.unit;
  const [lo, hi] = st.ci_per_decade;
  const q = r.regions.find((c) => c.region_id === region.id)?.q_mk;
  const mk = st.mk.p < 0.05 ? "sig" : "";

  return (
    <>
      {/* 핵심 숫자 한 줄 */}
      <dl className="kpis">
        <div>
          <dt>10년당 변화</dt>
          <dd className="kpi-v">
            {signed(st.slope_per_decade)}
            <small>{unit}</small>
          </dd>
          <dd className="kpi-s">
            95% 신뢰구간 {signed(lo)} ~ {signed(hi)}
          </dd>
        </div>
        <div>
          <dt>판정</dt>
          <dd className="kpi-v kpi-text">{st.verdict.label}</dd>
          <dd className="kpi-s">{st.method === "sen" ? "Sen 기울기 기준" : "OLS 기울기 기준"}</dd>
        </div>
        <div>
          <dt>Mann-Kendall</dt>
          <dd className="kpi-v kpi-text">
            <span className={`badge ${mk}`}>{pText(st.mk.p)}</span>
          </dd>
          <dd className="kpi-s">t-검정 {pText(st.ols.p)}</dd>
        </div>
        <div>
          <dt>초기 → 최근 평균</dt>
          <dd className="kpi-v">
            {st.early.mean.toFixed(1)} → {st.late.mean.toFixed(1)}
            <small>{unit}</small>
          </dd>
          <dd className="kpi-s">
            {st.early.from}–{st.early.to}년 / {st.late.from}–{st.late.to}년
          </dd>
        </div>
      </dl>

      {/* 그래프 틀: 같은 자리에서 그래프·지도·표 */}
      <section className="card frame">
        <header className="frame-head">
          <div className="frame-titles">
            <h2>{claim(r)}</h2>
            <p className="muted small">
              {region.name}({region.country}), {r.start}–{r.end}년, {r.variable.stage}
            </p>
          </div>
          <div className="seg frame-tabs" role="group" aria-label="보기">
            {VIEWS.map((v) => (
              <button key={v.id} aria-pressed={view === v.id} onClick={() => setView(v.id)}>
                {v.label}
              </button>
            ))}
          </div>
        </header>

        <div className="frame-body">
          {view === "chart" && <TrendChart r={r} />}
          {view === "map" && (
            <>
              <div className="frame-map">
                <RegionMap regions={regions} selected={region.id} onSelect={onRegion} comparison={r.regions} unit={unit} />
              </div>
              <p className="muted small">
                같은 변수·기간으로 계산한 산지별 추세 방향. 마커를 누르면 해당 산지로 전환.
                {q !== undefined && ` 다중검정 보정(FDR) q = ${q.toFixed(3)} (산지 ${r.regions.length}곳 비교).`}
              </p>
            </>
          )}
          {view === "table" && (
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
                        {x.year === st.leave_out.year && <span className="badge">최대 이상치</span>}
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
        </div>

        <footer className="frame-foot">
          <span>
            출처: {r.variable.dataset}, {r.variable.resolution}
          </span>
          {r.is_mock && (
            <span className="demo-flag" title={r.source_note}>
              예시 데이터
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => downloadCsv(r, region)}>
            CSV 받기
          </button>
        </footer>
      </section>
    </>
  );
}
