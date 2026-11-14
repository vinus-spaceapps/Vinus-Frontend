import { Link, useNavigate } from "react-router-dom";
import { MiniBars } from "../components/Stripes";
import MoonHero from "../components/MoonHero";
import { useCatalog } from "../lib/catalog";
import { toSearch, useSelection } from "../lib/selection";

// 그림은 모두 실제 자료(2001–2026, Railway 실서버 값)로 그림.
// 영동 생육기 적산온도 (°C·일): 첫 화면 줄무늬와 계산 미리 보기
const GDD = [1853, 1696, 1600, 1760, 1792, 1701, 1778, 1786, 1719, 1785, 1653, 1792, 1866, 1745, 1843, 1913, 1844, 1909, 1861, 1708, 1854, 1891, 2052, 2167, 2016, 2012];

// 예시: 실제 결과에서 고른 질문. 각 카드의 막대는 그 지표의 해마다 값.
const DEMOS = [
  {
    tag: "Disease & humidity",
    region: "Yeongdong",
    q: "Are hot, humid days becoming more common?",
    fact: "+9.7 days per decade, significant",
    values: [20, 15, 3, 22, 12, 23, 23, 21, 2, 27, 8, 23, 25, 11, 16, 26, 26, 25, 25, 18, 19, 33, 28, 56, 39, 41],
    params: { variables: ["hot_humid_days", "tropical_nights"], region: "yeongdong", start: 2001, end: 2026, thresholds: {} },
  },
  {
    tag: "Temperature & frost",
    region: "Bordeaux",
    q: "Are harvest nights getting warmer?",
    fact: "+7.6 days per decade, significant",
    values: [20, 17, 32, 29, 17, 20, 10, 14, 24, 14, 29, 28, 18, 26, 22, 30, 21, 31, 25, 35, 28, 43, 41, 25, 33, 46],
    params: { variables: ["harvest_warm_nights", "harvest_tmin_mean"], region: "bordeaux", start: 2001, end: 2026, thresholds: {} },
  },
  {
    tag: "Temperature & frost",
    region: "Burgundy",
    q: "Frost is down overall, but what about after budburst?",
    fact: "Annual frost days: −16 per decade, significant",
    values: [78, 71, 87, 97, 110, 49, 92, 101, 90, 85, 62, 91, 61, 71, 54, 73, 70, 68, 49, 75, 73, 59, 38, 60, 42],
    params: { variables: ["annual_frost_days", "frost_after_budburst"], region: "burgundy", start: 2001, end: 2026, thresholds: {} },
  },
];

const STEPS = [
  ["Pick indicators", "Choose up to 3 of 949 indicators, such as frost, heatwaves and harvest rain. Describe your worry in a sentence and the AI picks them for you."],
  ["Region and period", "7 wine regions, 2001–2026. Enter your vineyard’s budburst and harvest dates to recalculate for those windows."],
  ["Compute the trend", "Fits a Sen slope with a 95% confidence interval to the yearly values and shows the change per decade."],
  ["Verdict and checks", "Two significance tests, a re-test without the most extreme year, and a comparison with weather stations and satellites."],
];

// 지표 묶음마다 그 묶음이 하는 일을 그린 작은 선 그림
const FAMILY_ART = {
  // 100개 지표 = 10×10 점, 카테고리 몇 개만 밝게
  core: (
    <svg viewBox="0 0 200 120" aria-hidden>
      {Array.from({ length: 100 }, (_, i) => (
        <circle key={i} cx={30 + (i % 10) * 15.5} cy={10 + Math.floor(i / 10) * 11} r="2.6" className={[3, 14, 22, 37, 41, 58, 66, 73, 85, 99].includes(i) ? "on" : ""} />
      ))}
    </svg>
  ),
  // 표준 극값 지수: 막대가 기준선을 넘으면 밝게
  etccdi: (
    <svg viewBox="0 0 200 120" aria-hidden>
      <path className="dash" d="M10 44h180" />
      {[60, 42, 70, 38, 55, 30, 66, 48, 26, 58, 34, 22].map((h, i) => (
        <rect key={i} x={14 + i * 15} y={h} width="8" height={110 - h} rx="2" className={h < 44 ? "on" : ""} />
      ))}
    </svg>
  ),
  // 평년 대비 극값: 분포 곡선의 위쪽 10% 꼬리
  extremes: (
    <svg viewBox="0 0 200 120" aria-hidden>
      <path className="fill" d="M150 100 C158 96 166 92 176 90 L190 100 Z" />
      <path className="line" d="M10 100 C50 98 70 20 100 20 S150 96 190 100" />
      <path className="dash" d="M150 20v80" />
    </svg>
  ),
  // 월·계절 통계: 12달 × 6가지 변수 칸
  stats: (
    <svg viewBox="0 0 200 120" aria-hidden>
      {Array.from({ length: 72 }, (_, i) => (
        <rect key={i} x={22 + (i % 12) * 13.5} y={14 + Math.floor(i / 12) * 15.5} width="10" height="11" rx="2" style={{ opacity: 0.15 + 0.85 * Math.abs(Math.sin(i * 0.9 + Math.floor(i / 12))) }} />
      ))}
    </svg>
  ),
  // 질문으로 찾기: 말풍선 둘
  ai: (
    <svg viewBox="0 0 200 120" aria-hidden>
      <rect className="line" x="24" y="20" width="110" height="34" rx="8" />
      <path className="line" d="M40 34h70M40 42h44" />
      <rect className="fillbox" x="70" y="66" width="106" height="34" rx="8" />
      <path className="ink" d="M86 80h70M86 88h40" />
    </svg>
  ),
} as const;

const FAMILIES = [
  { id: "core", name: "Core indicators", n: 100, d: "Indicators like frost days, growing degree days and disease-risk days, each with a hand-written definition and rationale", wide: true },
  { id: "etccdi", name: "Climate extremes indices", n: 27, d: "The World Meteorological Organization standard (ETCCDI). Compare directly with published results for other regions", wide: true },
  { id: "extremes", name: "Days beyond normal", n: 100, d: "How much more often the top and bottom 10% of days (vs. 2001–2010) now occur" },
  { id: "stats", name: "Monthly & seasonal stats", n: 722, d: "Temperature, precipitation, humidity, soil moisture, solar radiation and wind by month, season and growth stage" },
  { id: "ai", name: "Ask a question", n: null, d: "Type something like ‘I’m worried about spring frost’ and matching indicators go into your basket" },
] as const;

const FAQ = [
  ["What does ‘significant’ mean?", "It means that, if there were no trend, the chance of seeing a change this large by luck (the p-value) is under 5%. A trend is ‘significant’ only when both Mann-Kendall and the t-test pass this bar; if only one does, the verdict is ‘tests disagree’."],
  ["How is the change per decade calculated?", "It is the slope of a straight line fitted to the yearly values, multiplied by 10. Indicators with many outlier years use the median-based Sen slope."],
  ["Does it apply directly to my vineyard?", "No. Values are averages over a grid cell of about 50 km. The weather station and satellite checks on the results page show how the grid compares with real observations."],
  ["Where does the data come from?", "NASA POWER (MERRA-2, CERES) daily data and the MODIS satellite (night-time land surface temperature, green-up date). The two smoke indicators (AIRS, OMI) don’t have real data yet, so they use sample values, which are flagged on the results page."],
  ["Can I trust the AI explanations?", "The AI is restricted to numbers the statistics engine has already calculated. If an answer contains a number the engine didn’t produce, it is flagged."],
];

const SOURCES = ["MERRA-2", "CERES", "MODIS", "NASA POWER", "AIRS", "OMI"];

// 세 가지 확인 아이콘 (원 안의 가는 선 그림)
const CHECK_ART = {
  tests: (
    <svg viewBox="0 0 64 64" aria-hidden>
      <path d="M10 46h44M14 46V18" />
      <path d="M16 40c8 0 10-18 18-18s10 14 18 14" />
      <path d="M16 42c8 0 12-12 18-12s10 8 18 8" opacity=".5" />
    </svg>
  ),
  leave: (
    <svg viewBox="0 0 64 64" aria-hidden>
      <path d="M12 48h40" />
      <path d="M17 48V36M25 48V30M33 48V18M41 48V28M49 48V24" />
      <circle cx="33" cy="14" r="5" />
    </svg>
  ),
  ground: (
    <svg viewBox="0 0 64 64" aria-hidden>
      <path d="M32 10v30" />
      <path d="M24 18l8-8 8 8" />
      <path d="M14 50h36M20 50l4-10h16l4 10" />
    </svg>
  ),
};

// 계산 결과 미리 보기: 영동 적산온도 해마다 값(점) + Sen 추세선
function ResultPreview() {
  const lo = 1550, hi = 2200;
  const x = (i: number) => 10 + (i / (GDD.length - 1)) * 280;
  const y = (v: number) => 110 - ((v - lo) / (hi - lo)) * 100;
  const slope = 12.354; // °C·days per year (+123.5 per decade)
  const rest = GDD.map((v, i) => v - slope * i).sort((a, b) => a - b);
  const b = (rest[12] + rest[13]) / 2;
  return (
    <figure className="preview" aria-label="Yeongdong growing-season growing degree days, 2001–2026: up 123.5 °C·days per decade, significant">
      <figcaption>
        <span className="tag">Temperature & frost</span>
        <span>Yeongdong · Growing-season GDD</span>
      </figcaption>
      <p className="preview-num num">
        +123.5<small>°C·days / decade</small>
      </p>
      <svg viewBox="0 0 300 120" aria-hidden>
        <path className="grid" d="M10 110h280M10 60h280M10 10h280" />
        <polyline className="series" points={GDD.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
        {GDD.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={v === Math.max(...GDD) ? 3.6 : 2.2} className={v === Math.max(...GDD) ? "peak" : ""} />
        ))}
        <line className="trend" x1={x(0)} y1={y(b)} x2={x(GDD.length - 1)} y2={y(b + slope * (GDD.length - 1))} />
      </svg>
      <div className="preview-foot">
        <span className="pill-sm on">Increasing, significant</span>
        <span className="pill-sm">Mann-Kendall p &lt; 0.001</span>
        <span className="pill-sm">2001–2026</span>
      </div>
    </figure>
  );
}

// 산지 7곳: 위도·경도 그대로 찍은 좌표 격자 (경도 −180~180, 위도 −60~75)
function RegionGrid() {
  const { regions } = useCatalog();
  const X = (lon: number) => lon + 180;
  const Y = (lat: number) => 90 - lat;
  return (
    <svg className="globe" viewBox="0 15 360 135" role="img" aria-label={`Locations of ${regions.length} wine regions: ${regions.map((r) => r.name).join(", ")}`}>
      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
        <line key={lon} className="grat" x1={X(lon)} x2={X(lon)} y1={15} y2={150} />
      ))}
      {[60, 30, -30].map((lat) => (
        <line key={lat} className="grat" x1={0} x2={360} y1={Y(lat)} y2={Y(lat)} />
      ))}
      <line className="equator" x1={0} x2={360} y1={90} y2={90} />
      <text className="glabel" x={4} y={87}>
        Equator
      </text>
      {regions.map((r) => (
        <g key={r.id}>
          <circle className="halo" cx={X(r.lon)} cy={Y(r.lat)} r="7" />
          <circle className="pt" cx={X(r.lon)} cy={Y(r.lat)} r="1.6" />
        </g>
      ))}
    </svg>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { set } = useSelection();
  const { regions } = useCatalog();

  const openDemo = (d: (typeof DEMOS)[number]) => {
    set({ basket: d.params.variables, region: d.params.region, start: d.params.start, end: d.params.end });
    nav(`/analyze${toSearch(d.params)}`);
  };

  return (
    <main className="landing">
      {/* Hero: centered title over a rose moon rising above a wine surface */}
      <section className="hero">
        <MoonHero />
        <div className="hero-copy">
          <img className="hero-mark" src="/logo-wordmark-white.png" width={150} height={43} alt="Vinus" />
          <h1>
            Your region’s climate change,
            <br />
            in NASA data, not gut feel
          </h1>
          <p>Using 2001–2026 satellite and reanalysis data for 7 wine regions, Vinus calculates whether frost, heat, rain and disease risk are really changing.</p>
          <div className="row-btns">
            <Link className="btn primary" to="/variables">
              Start analysis
            </Link>
            <button className="btn secondary" onClick={() => openDemo(DEMOS[0])}>
              See an example
            </button>
          </div>
        </div>
      </section>

      <section className="wrap intro">
        <p className="label">Wine climate trend detective</p>
        <p className="intro-text">
          Every year you hear ‘it’s unusually hot this year.’ Vinus uses NASA data and statistical tests to tell whether that feeling is a real trend or just a few chance years, so growers can rely on it when deciding on varieties, disease control, harvest timing and equipment investment.
        </p>
        <ul className="sources" aria-label="Data sources">
          {SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="wrap steps">
        <div>
          <p className="label">How it works</p>
          <h2>
            From feeling to numbers,
            <br />
            from numbers to a verdict
          </h2>
          <ol>
            {STEPS.map(([t, d], i) => (
              <li key={t}>
                <span className="step-n num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ResultPreview />
      </section>

      {/* Coordinates of the 7 regions + the three checks */}
      <section className="wrap checks-sec">
        <p className="label center">Statistics engine</p>
        <h2 className="center">
          Is the trend real?
          <br />We check three times
        </h2>
        <p className="lead center">The AI only explains numbers the engine calculated. It never makes numbers up.</p>
        <div className="globe-wrap">
          <RegionGrid />
          <ul className="globe-names">
            {regions.map((r) => (
              <li key={r.id}>
                <i aria-hidden />
                {r.name.replace(/\s*\(.*\)$/, "")}
                <span>{r.country}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="checks">
          {(
            [
              ["tests", "Two tests", "‘Significant’ only when Mann-Kendall and the t-test both give p < 0.05."],
              ["leave", "Drop a year, re-run", "Recalculates without the most extreme year to see if the conclusion holds."],
              ["ground", "Check against the ground", "Compares grid values with nearby weather stations and 1 km satellite data."],
            ] as const
          ).map(([k, t, d]) => (
            <div key={k}>
              <span className="check-art">{CHECK_ART[k]}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap topics">
        <div className="sec-head">
          <div>
            <p className="label">Indicator families</p>
            <h2>
              949 indicators,
              <br />
              four families
            </h2>
          </div>
          <p className="sec-aside">Core indicators each have a hand-written definition and rationale; the rest are standard indices built from the same raw data.</p>
        </div>
        <div className="topic-grid">
          {FAMILIES.map((f) => (
            <Link key={f.id} to={f.id === "ai" ? "/variables" : `/variables?f=${f.id}`} className={`topic ${"wide" in f && f.wide ? "wide" : ""}`}>
              <span className="topic-art">{FAMILY_ART[f.id]}</span>
              <span className="topic-text">
                <b>
                  {f.name}
                  {f.n && <em className="num">{f.n}</em>}
                </b>
                <span>{f.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap demos">
        <div className="sec-head">
          <div>
            <p className="label">Example analyses</p>
            <h2>Questions Vinus answers</h2>
          </div>
          <Link className="btn primary" to="/variables">
            Choose your own
          </Link>
        </div>
        <div className="demo-grid">
          {DEMOS.map((d) => (
            <article key={d.q} className="demo">
              <MiniBars values={d.values} label={`${d.region} yearly values, ${d.fact}`} />
              <div className="demo-meta">
                <span className="tag">{d.tag}</span>
                <span>{d.region}</span>
              </div>
              <h3>{d.q}</h3>
              <p className="demo-fact">{d.fact}</p>
              <button className="btn primary sm" onClick={() => openDemo(d)}>
                See results
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap faq">
        <div>
          <p className="label">FAQ</p>
          <h2>
            Before you
            <br />
            read the results
          </h2>
        </div>
        <div className="faq-list">
          {FAQ.map(([q, a], i) => (
            <details key={q} {...(i === 0 ? { open: true } : {})}>
              <summary>
                {q}
                <i aria-hidden />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="wrap footer">
        <img src="/logo-wordmark-white.png" width={110} height={32} alt="Vinus" />
        <p>NASA Space Apps Challenge 2026 Seoul, challenge ‘Be An Earth System Trend Detective’. Team Yulchon.</p>
        <p className="muted">Results are regional averages (about 50 km) and don’t represent individual vineyards.</p>
        <p className="muted">The Vinus logo was made with an AI image generation tool. (AI-generated logo)</p>
      </footer>
    </main>
  );
}
