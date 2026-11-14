import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import InsightPanel from "../components/InsightPanel";
import RegionMap from "../components/RegionMap";
import TrendChart from "../components/TrendChart";
import VerdictCard from "../components/VerdictCard";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { wideScreen } from "../lib/format";
import { BASKET_LIMIT, DATA_START, DEFAULT_END, fromSearch, toSearch, useSelection, type AnalyzeParams } from "../lib/selection";
import type { AnalysisResponse, AnalyzeQuery, NextStepChange, YearValue } from "../lib/types";

const YEARS = Array.from({ length: DEFAULT_END - DATA_START + 1 }, (_, i) => DATA_START + i);

function parseCsv(text: string): YearValue[] {
  const out: YearValue[] = [];
  for (const line of text.split(/\r?\n/)) {
    const [y, v] = line.split(/[,;\t]/).map((s) => s.trim());
    const year = Number(y);
    const value = Number(v);
    if (Number.isInteger(year) && year > 1900 && year < 2100 && v !== "" && Number.isFinite(value)) out.push({ year, value });
  }
  return out;
}

// 결과가 본문, 인사이트 AI(RAG)는 오른쪽 사이드바. 지도는 본문 안의 산지 비교용 카드.
export default function Analysis() {
  const { search } = useLocation();
  const nav = useNavigate();
  const { variables, regions, health } = useCatalog();
  const { sel, set } = useSelection();
  const params = useMemo(() => fromSearch(search), [search]);

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(wideScreen);
  const [mapVar, setMapVar] = useState<string | null>(null);
  const [userSeries, setUserSeries] = useState<YearValue[] | null>(null);
  const [userLabel, setUserLabel] = useState("내 기록");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const openBtn = useRef<HTMLButtonElement>(null);

  const stages = useMemo(() => {
    const s = Object.fromEntries(Object.entries(sel.stages).filter(([, v]) => /^\d{2}-\d{2}$/.test(v ?? "")));
    return Object.keys(s).length ? s : null;
  }, [sel.stages]);

  const query: AnalyzeQuery | null = useMemo(
    () =>
      params && {
        variables: params.variables,
        region: params.region,
        start: params.start,
        end: params.end,
        thresholds: params.thresholds,
        stages,
        user_series: userSeries,
        user_label: userSeries ? userLabel : null,
      },
    [params, stages, userSeries, userLabel],
  );

  useEffect(() => {
    if (!query) return;
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .analyze(query)
      .then((d) => alive && setData(d))
      .catch((e: Error) => alive && setError(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [query]);

  // 칩·다음 단계 버튼으로 바꾼 값을 다음 화면 기본값에도 반영
  useEffect(() => {
    if (params) set({ basket: params.variables, region: params.region, start: params.start, end: params.end });
  }, [search]); // 의도적으로 search 만 의존

  if (!params) return <Navigate to="/variables" replace />;

  const update = (patch: Partial<AnalyzeParams>) => nav(`/analyze${toSearch({ ...params, ...patch })}`, { replace: true });

  const apply = (change: NextStepChange, varId: string) => {
    setNotice(null);
    if (change.type === "threshold") update({ thresholds: { ...params.thresholds, [varId]: change.value } });
    else if (change.type === "region") update({ region: change.value });
    else if (change.type === "start_year") update({ start: change.value });
    else if (change.type === "add_variable") {
      if (params.variables.includes(change.value)) return setNotice("이미 분석 중인 변수입니다.");
      if (params.variables.length < BASKET_LIMIT) update({ variables: [...params.variables, change.value] });
      else {
        // 가득 차면 지금 인사이트를 보는 변수는 남기고 다른 하나를 바꿔 넣습니다.
        const drop = params.variables.find((x) => x !== varId);
        update({ variables: [...params.variables.filter((v) => v !== drop), change.value] });
        setNotice(`변수는 최대 ${BASKET_LIMIT}개라 하나를 교체했습니다.`);
      }
    }
  };

  const addable = variables.filter((v) => !params.variables.includes(v.id));
  const shownMapVar = data?.results.find((r) => r.variable.id === mapVar) ?? data?.results[0];
  const q = shownMapVar?.regions.find((c) => c.region_id === data?.region.id)?.q_mk;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const pts = parseCsv(await f.text());
    if (pts.length < 4) setNotice("연도,값 형식의 행이 4개 이상 필요합니다. 예: 2015,3.2");
    else {
      setUserSeries(pts);
      setFileName(f.name);
      setNotice(null);
    }
  };

  return (
    <main className="container page">
      <div className={`with-panel ${panel ? "open" : ""}`}>
        <section>
          <div className="card summary-bar">
            <div className="grp">
              {params.variables.map((id) => (
                <span className="chip tag" key={id}>
                  {variables.find((v) => v.id === id)?.name ?? id}
                  {params.variables.length > 1 && (
                    <button onClick={() => update({ variables: params.variables.filter((v) => v !== id) })} aria-label="변수 빼기">
                      ×
                    </button>
                  )}
                </span>
              ))}
              {params.variables.length < BASKET_LIMIT && (
                <select className="chip-add" value="" onChange={(e) => e.target.value && update({ variables: [...params.variables, e.target.value] })} aria-label="변수 추가">
                  <option value="">+ 변수</option>
                  {addable.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <span className="sep" />
            <select className="chip-select" value={params.region} onChange={(e) => update({ region: e.target.value })} aria-label="산지">
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <span className="sep" />
            <div className="grp">
              <select className="chip-select" value={params.start} onChange={(e) => update({ start: Math.min(Number(e.target.value), params.end - 5) })} aria-label="시작 연도">
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
              <span className="muted">–</span>
              <select className="chip-select" value={params.end} onChange={(e) => update({ end: Math.max(Number(e.target.value), params.start + 5) })} aria-label="끝 연도">
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            {loading && <span className="spinner" aria-label="계산 중" />}
            {data?.is_mock && (
              <span className="demo-flag" style={{ marginLeft: "auto" }} title="실제 관측값이 아닌 예시 데이터">
                예시 데이터
              </span>
            )}
          </div>

          {error && <div className="error-box block-gap">{error}</div>}
          {notice && <div className="flag block-gap">{notice}</div>}
          {!data && !error && (
            <div className="empty">
              <span className="spinner" /> 분석 중…
            </div>
          )}

          {data && (
            <div className="results" aria-busy={loading} {...(loading ? { "data-stale": "" } : {})}>
              <div className="analysis-top">
                <div className="card analysis-map">
                  <RegionMap regions={regions} selected={data.region.id} onSelect={(id) => update({ region: id })} comparison={shownMapVar?.regions} unit={shownMapVar?.variable.unit} />
                </div>
                <div className="card region-info">
                  <div className="side-head">
                    <span className="label">산지</span>
                    <h2>{data.region.name}</h2>
                    <p className="muted">{data.region.country}</p>
                  </div>
                  <p className="muted small">{data.region.blurb}</p>
                  {data.results.length > 1 && (
                    <div className="seg var-seg" role="group" aria-label="지도 색 기준 변수">
                      {data.results.map((r) => (
                        <button key={r.variable.id} aria-pressed={r.variable.id === shownMapVar?.variable.id} onClick={() => setMapVar(r.variable.id)}>
                          {r.variable.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="sources">
                    <p>지도 색: 같은 변수·기간의 산지별 추세 방향. 마커를 누르면 해당 산지로 전환.</p>
                    {q !== undefined && shownMapVar && (
                      <p>
                        다중검정 보정(FDR) q = {q.toFixed(3)} (산지 {shownMapVar.regions.length}곳 비교)
                      </p>
                    )}
                    <p>{data.resolution_note}</p>
                  </div>
                </div>
              </div>

              {data.results.map((r) => (
                <div key={r.variable.id} className="result-block">
                  <div className="card chart-card">
                    <div className="sec-head">
                      <h3>
                        {r.variable.name} <span className="muted small">({r.variable.unit}, {r.variable.stage})</span>
                      </h3>
                      <span className="muted small">
                        {r.variable.dataset}, {r.variable.resolution}
                      </span>
                    </div>
                    <TrendChart r={r} />
                  </div>
                  <VerdictCard r={r} region={data.region} onThreshold={(v) => update({ thresholds: { ...params.thresholds, [r.variable.id]: v } })} />
                </div>
              ))}

              <div className="card upload-card">
                <div className="sec-head">
                  <h3>
                    내 기록 겹치기 <span className="muted small">(선택)</span>
                  </h3>
                </div>
                <p className="muted small">연도,값 형식 CSV (예: 수확량, 서리 피해율). 그래프 오른쪽 축에 표시. 상관관계는 인과관계가 아님.</p>
                <div className="upload-row">
                  <label className="field-inline">
                    <span className="muted small">이름</span>
                    <input type="text" value={userLabel} onChange={(e) => setUserLabel(e.target.value)} />
                  </label>
                  <label
                    className="drop"
                    {...(dragOver ? { "data-over": "" } : {})}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      void onFile(e.dataTransfer.files[0]);
                    }}
                  >
                    <input
                      type="file"
                      className="sr-only"
                      accept=".csv,text/csv,text/plain"
                      onChange={(e) => {
                        void onFile(e.target.files?.[0]);
                        e.target.value = ""; // 같은 파일을 다시 골라도 반영되게
                      }}
                    />
                    <span className="btn btn-ghost btn-sm" aria-hidden>
                      파일 선택
                    </span>
                    <span className={`drop-name ${fileName ? "" : "muted"}`}>{fileName ?? "또는 파일을 여기에 끌어 놓기"}</span>
                  </label>
                  {userSeries && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setUserSeries(null);
                        setFileName(null);
                      }}
                    >
                      겹치기 끄기 ({userSeries.length}개 연도)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 닫아도 대화가 남도록 숨기기만. display: contents 라 열려 있을 때는 aside 가 그대로 그리드 칸이 됨 */}
        {query && data && (
          <div style={{ display: panel ? "contents" : "none" }}>
            <InsightPanel
              query={query}
              vars={data.results.map((r) => ({ id: r.variable.id, name: r.variable.name }))}
              aiEnabled={!!health?.ai.enabled}
              onApply={apply}
              onClose={() => {
                setPanel(false);
                requestAnimationFrame(() => openBtn.current?.focus());
              }}
            />
          </div>
        )}
      </div>
      {!panel && (
        <button ref={openBtn} className="glass panel-toggle" onClick={() => setPanel(true)}>
          <span aria-hidden>✦</span> 인사이트 AI
        </button>
      )}
    </main>
  );
}
