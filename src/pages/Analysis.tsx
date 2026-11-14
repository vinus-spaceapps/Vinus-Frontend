import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import InsightPanel from "../components/InsightPanel";
import { Card, DoughnutCard, HeatmapCard, KpiRow, RegionBarsCard, TrendCard, ValidationCard } from "../components/DashCards";
import Icon from "../components/Icon";
import RegionMap from "../components/RegionMap";
import Stripes from "../components/Stripes";
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

// 결과 화면: Starwave 에피소드 상세 구성 (행성 띠 머리 → 위에 붙는 바 → 판정 문장 → 핵심 숫자 → 자료 칸들 → 다른 산지 링크).
// 인사이트 AI(RAG)는 오른쪽 사이드바.
export default function Analysis() {
  const { search } = useLocation();
  const nav = useNavigate();
  const { variables, families, categories, regions, health } = useCatalog();
  const { sel, set } = useSelection();
  const params = useMemo(() => fromSearch(search), [search]);

  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(wideScreen);
  const [active, setActive] = useState<string | null>(null);
  const [userSeries, setUserSeries] = useState<YearValue[] | null>(null);
  const [userLabel, setUserLabel] = useState("My records");
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
  }, [search]); // intentionally depends on search only

  if (!params) return <Navigate to="/variables" replace />;

  const update = (patch: Partial<AnalyzeParams>) => nav(`/analyze${toSearch({ ...params, ...patch })}`, { replace: true });

  const apply = (change: NextStepChange, varId: string) => {
    setNotice(null);
    if (change.type === "threshold") update({ thresholds: { ...params.thresholds, [varId]: change.value } });
    else if (change.type === "region") update({ region: change.value });
    else if (change.type === "start_year") update({ start: change.value });
    else if (change.type === "add_variable") {
      if (params.variables.includes(change.value)) return setNotice("This indicator is already in the analysis.");
      if (params.variables.length < BASKET_LIMIT) update({ variables: [...params.variables, change.value] });
      else {
        // 가득 차면 지금 인사이트를 보는 변수는 남기고 다른 하나를 바꿔 넣습니다.
        const drop = params.variables.find((x) => x !== varId);
        update({ variables: [...params.variables.filter((v) => v !== drop), change.value] });
        setNotice(`You can analyze up to ${BASKET_LIMIT} indicators, so one was replaced.`);
      }
    }
  };

  const addable = variables.filter((v) => !params.variables.includes(v.id));
  const shown = data?.results.find((r) => r.variable.id === active) ?? data?.results[0];

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const pts = parseCsv(await f.text());
    if (pts.length < 4) setNotice("The file needs at least 4 rows in year,value format, e.g. 2015,3.2");
    else {
      setUserSeries(pts);
      setFileName(f.name);
      setNotice(null);
    }
  };

  const regionName = data?.region.name ?? regions.find((r) => r.id === params.region)?.name ?? "Analysis results";
  const catName = shown ? categories.find((c) => c.id === shown.variable.category)?.name : null;
  // 맨 아래 '다른 산지' 링크: 목록에서 다음 산지
  const ri = regions.findIndex((r) => r.id === params.region);
  const nextRegion = regions.length > 1 ? regions[(ri + 1) % regions.length] : null;

  return (
    <main>
      {/* Header: big title over climate stripes of the current indicator (one stripe = one year, brighter = higher value) + white button on the right */}
      <header className="ep-hero">
        {shown && <Stripes values={shown.series.map((p) => p.value)} className="ep-stripes" />}
        {shown && (
          <p className="stripes-note">
            Background stripes: {shown.variable.name}, {shown.start}–{shown.end}. Brighter means a higher value.
          </p>
        )}
        <div className="wrap ep-hero-in">
          <div>
            <p className="label">{data?.region.country ?? "Analysis results"}</p>
            <h1>
              {regionName}
              {shown && (
                <>
                  <br />
                  {shown.variable.name}
                </>
              )}
            </h1>
          </div>
          <button ref={openBtn} className="btn primary" aria-pressed={panel} onClick={() => setPanel((p) => !p)}>
            <Icon name="comment" size={16} />
            {panel ? "Close Insight AI" : "Insight AI"}
          </button>
        </div>
      </header>

      {/* Sticky bar: indicator chips + region and period */}
      <div className="sticky-bar">
        <div className="wrap sticky-in">
          <div className="chips" role="group" aria-label="Indicators shown">
            {params.variables.map((id) => {
              const name = variables.find((v) => v.id === id)?.name ?? id;
              const on = shown ? shown.variable.id === id : id === params.variables[0];
              return (
                <span key={id} className="tab-chip" {...(on ? { "data-on": "" } : {})}>
                  <button onClick={() => setActive(id)} aria-pressed={on}>
                    {name}
                  </button>
                  {params.variables.length > 1 && (
                    <button className="x" onClick={() => update({ variables: params.variables.filter((v) => v !== id) })} aria-label={`Remove ${name}`}>
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </span>
              );
            })}
            {params.variables.length < BASKET_LIMIT && (
              <select className="tab-add" value="" onChange={(e) => e.target.value && update({ variables: [...params.variables, e.target.value] })} aria-label="Add indicator">
                <option value="">+ Indicator</option>
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
          <span className="spacer" />
          {loading && <span className="spinner" aria-label="Calculating" />}
          <label className="input sm">
            <Icon name="pin" size={16} />
            <select value={params.region} onChange={(e) => update({ region: e.target.value })} aria-label="Wine region">
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="input sm">
            <Icon name="calendar" size={16} />
            <select value={params.start} onChange={(e) => update({ start: Math.min(Number(e.target.value), params.end - 5) })} aria-label="Start year">
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
            <span className="muted">–</span>
            <select value={params.end} onChange={(e) => update({ end: Math.max(Number(e.target.value), params.start + 5) })} aria-label="End year">
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className={`wrap with-panel ${panel ? "open" : ""}`}>
        <div className="an-main">
          {error && <div className="error-box block-gap">{error}</div>}
          {notice && <div className="flag block-gap">{notice}</div>}
          {!data && !error && (
            <div className="empty">
              <span className="spinner" /> Calculating…
            </div>
          )}

          {data && shown && (
            <div className="results" aria-busy={loading} {...(loading ? { "data-stale": "" } : {})}>
              {/* Intro block: tag and period + verdict sentence */}
              <section className="statement">
                <div className="meta">
                  {catName && <span className="tag">{catName}</span>}
                  <span className="num">
                    {shown.start}–{shown.end}
                  </span>
                  <span className="num">{shown.stats.n} years</span>
                  <span>{shown.variable.dataset}</span>
                  {shown.is_mock && <span className="tag warn">Sample data</span>}
                </div>
                <p>{shown.verdict_text}</p>
              </section>

              <KpiRow r={shown} />

              <div className="dash">
                <TrendCard r={shown} region={data.region} />
                <VerdictCard r={shown} onThreshold={(v) => update({ thresholds: { ...params.thresholds, [shown.variable.id]: v } })} />
                <RegionBarsCard r={shown} region={data.region} onRegion={(id) => update({ region: id })} />
                <HeatmapCard r={shown} />
                <DoughnutCard r={shown} region={data.region} />
                <Card className="span-2 map-card" title="Region map" desc="Verdicts by region for the same indicator and period. Click a dot to switch region; the dashed box is the analysis area">
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
                <Card className="glow-card" title="Overlay your records" desc="A CSV in year,value format (e.g. yield, frost damage rate). Correlation is not causation." footer={<p className="card-note">{data.region.blurb}. {data.resolution_note}</p>}>
                  <label className="input">
                    <span className="muted">Name</span>
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
                        e.target.value = ""; // so picking the same file again still triggers
                      }}
                    />
                    <span className="btn secondary sm" aria-hidden>
                      Choose file
                    </span>
                    <span className={`drop-name ${fileName ? "" : "muted"}`}>{fileName ?? "or drop it here"}</span>
                  </label>
                  {userSeries && (
                    <button
                      className="btn secondary sm"
                      onClick={() => {
                        setUserSeries(null);
                        setFileName(null);
                      }}
                    >
                      Remove overlay ({userSeries.length} years)
                    </button>
                  )}
                </Card>
              </div>

              {nextRegion && (
                <button className="next-link" onClick={() => update({ region: nextRegion.id })}>
                  See {nextRegion.name} for the same indicator ›
                </button>
              )}
            </div>
          )}
        </div>

        {/* Only hidden on close so the conversation survives. With display: contents the aside becomes the grid cell when open */}
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
