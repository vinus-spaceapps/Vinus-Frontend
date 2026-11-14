import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import InsightPanel from "../components/InsightPanel";
import { Card, DoughnutCard, HeatmapCard, KpiRow, RegionBarsCard, TrendCard, ValidationCard } from "../components/DashCards";
import Icon from "../components/Icon";
import RegionMap from "../components/RegionMap";
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

// Figma "Full charts components" 카드로 짠 결과 화면: 핵심 숫자 4장 → 카드 격자(넓은 추세 카드는 2칸).
// 인사이트 AI(RAG)는 오른쪽 사이드바.
export default function Analysis() {
  const { search } = useLocation();
  const nav = useNavigate();
  const { variables, families, regions, health } = useCatalog();
  const { sel, set } = useSelection();
  const params = useMemo(() => fromSearch(search), [search]);

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(wideScreen);
  const [active, setActive] = useState<string | null>(null);
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
  const shown = data?.results.find((r) => r.variable.id === active) ?? data?.results[0];

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

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });

  return (
    <main className="page an-page">
      <div className={`with-panel ${panel ? "open" : ""}`}>
        <div className="an-main">
          {/* 머리: 큰 제목 + 날짜 / 오른쪽 Forms 입력(회색 알약) + 인사이트 AI 버튼(둥근 아이콘) */}
          <header className="dash-head">
            <div className="dash-titles">
              <h1>{data?.region.name ?? regions.find((r) => r.id === params.region)?.name ?? "분석 결과"}</h1>
              <p>
                {data?.region.country ? `${data.region.country} · ` : ""}
                {today}
              </p>
            </div>
            <div className="dash-tools">
              <label className="input pill">
                <Icon name="pin" size={18} />
                <select value={params.region} onChange={(e) => update({ region: e.target.value })} aria-label="산지">
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="input pill">
                <Icon name="calendar" size={18} />
                <select value={params.start} onChange={(e) => update({ start: Math.min(Number(e.target.value), params.end - 5) })} aria-label="시작 연도">
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
                <span className="muted">–</span>
                <select value={params.end} onChange={(e) => update({ end: Math.max(Number(e.target.value), params.start + 5) })} aria-label="끝 연도">
                  {YEARS.map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </select>
              </label>
              <button ref={openBtn} className="ic big" aria-pressed={panel} aria-label="인사이트 AI" title="인사이트 AI" onClick={() => setPanel((p) => !p)}>
                <Icon name="comment" size={24} />
              </button>
            </div>
          </header>

          {/* 볼 변수: 알약 칩 (고른 것만 진하게) + 빼기, 끝에 + 변수 (묶음별로) */}
          <div className="var-row">
            <div className="seg" role="group" aria-label="볼 변수">
              {params.variables.map((id) => {
                const name = variables.find((v) => v.id === id)?.name ?? id;
                const on = shown ? shown.variable.id === id : id === params.variables[0];
                return (
                  <span key={id} className="tab-chip" {...(on ? { "data-on": "" } : {})}>
                    <button onClick={() => setActive(id)} aria-pressed={on}>
                      {name}
                    </button>
                    {params.variables.length > 1 && (
                      <button className="x" onClick={() => update({ variables: params.variables.filter((v) => v !== id) })} aria-label={`${name} 빼기`}>
                        <Icon name="close" size={14} />
                      </button>
                    )}
                  </span>
                );
              })}
              {params.variables.length < BASKET_LIMIT && (
                <select className="tab-add" value="" onChange={(e) => e.target.value && update({ variables: [...params.variables, e.target.value] })} aria-label="변수 추가">
                  <option value="">+ 변수</option>
                  {families.map((f) => (
                    <optgroup key={f.id} label={f.name}>
                      {addable
                        .filter((v) => v.family === f.id)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>
            {loading && <span className="spinner" aria-label="계산 중" />}
            {data?.is_mock && (
              <span className="pill-sm warn" title="실제 집계가 아직 없어 예시 값으로 계산">
                예시 데이터 포함
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

          {data && shown && (
            <div className="results" aria-busy={loading} {...(loading ? { "data-stale": "" } : {})}>
              <KpiRow r={shown} />

              <div className="dash">
                <TrendCard r={shown} region={data.region} />
                <VerdictCard r={shown} onThreshold={(v) => update({ thresholds: { ...params.thresholds, [shown.variable.id]: v } })} />
                <RegionBarsCard r={shown} region={data.region} onRegion={(id) => update({ region: id })} />
                <HeatmapCard r={shown} />
                <DoughnutCard r={shown} region={data.region} />
                <Card className="span-2 map-card" title="산지 지도" desc="같은 지표·기간의 산지별 판정. 점을 누르면 그 산지로, 점선 네모는 분석 범위">
                  <div className="map-frame">
                    <RegionMap
                      regions={regions}
                      selected={data.region.id}
                      onSelect={(id) => update({ region: id })}
                      comparison={shown.regions}
                      unit={shown.variable.unit}
                      higherIs={shown.variable.higher_is}
                    />
                  </div>
                </Card>
                {data.validation && <ValidationCard v={data.validation} variable={shown.variable} />}
                <Card title="내 기록 겹치기" desc="연도,값 형식 CSV (예: 수확량, 서리 피해율). 상관관계는 인과관계가 아님." footer={<p className="card-note">{data.region.blurb}. {data.resolution_note}</p>}>
                  <label className="input">
                    <span className="muted">이름</span>
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
                    <span className="btn outline-pill sm" aria-hidden>
                      파일 선택
                    </span>
                    <span className={`drop-name ${fileName ? "" : "muted"}`}>{fileName ?? "또는 여기에 끌어 놓기"}</span>
                  </label>
                  {userSeries && (
                    <button
                      className="btn pill sm"
                      onClick={() => {
                        setUserSeries(null);
                        setFileName(null);
                      }}
                    >
                      겹치기 끄기 ({userSeries.length}개 연도)
                    </button>
                  )}
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* 닫아도 대화가 남도록 숨기기만. display: contents 라 열려 있을 때는 aside 가 그대로 그리드 칸이 됨 */}
        {query && data && (
          <div style={{ display: panel ? "contents" : "none" }}>
            <InsightPanel
              query={query}
              vars={data.results.map((r) => ({ id: r.variable.id, name: r.variable.name }))}
              current={shown?.variable.id}
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
    </main>
  );
}
