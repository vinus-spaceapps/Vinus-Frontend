import { Link, useNavigate } from "react-router-dom";
import Stripes, { MiniBars } from "../components/Stripes";
import { useCatalog } from "../lib/catalog";
import { toSearch, useSelection } from "../lib/selection";

// 그림은 모두 실제 자료(2001–2026, Railway 실서버 값)로 그림.
// 영동 생육기 적산온도 (°C·일): 첫 화면 줄무늬와 계산 미리 보기
const GDD = [1853, 1696, 1600, 1760, 1792, 1701, 1778, 1786, 1719, 1785, 1653, 1792, 1866, 1745, 1843, 1913, 1844, 1909, 1861, 1708, 1854, 1891, 2052, 2167, 2016, 2012];

// 예시: 실제 결과에서 고른 질문. 각 카드의 막대는 그 지표의 해마다 값.
const DEMOS = [
  {
    tag: "병해·습도",
    region: "충북 영동",
    q: "덥고 습한 날이 늘었나?",
    fact: "10년에 +9.7일, 유의함",
    values: [20, 15, 3, 22, 12, 23, 23, 21, 2, 27, 8, 23, 25, 11, 16, 26, 26, 25, 25, 18, 19, 33, 28, 56, 39, 41],
    params: { variables: ["hot_humid_days", "tropical_nights"], region: "yeongdong", start: 2001, end: 2026, thresholds: {} },
  },
  {
    tag: "기온·서리",
    region: "보르도",
    q: "수확기 밤이 더워졌나?",
    fact: "10년에 +7.6일, 유의함",
    values: [20, 17, 32, 29, 17, 20, 10, 14, 24, 14, 29, 28, 18, 26, 22, 30, 21, 31, 25, 35, 28, 43, 41, 25, 33, 46],
    params: { variables: ["harvest_warm_nights", "harvest_tmin_mean"], region: "bordeaux", start: 2001, end: 2026, thresholds: {} },
  },
  {
    tag: "기온·서리",
    region: "부르고뉴",
    q: "서리는 줄었는데, 싹튼 뒤 서리도?",
    fact: "연간 서리일수 10년에 −16일, 유의함",
    values: [78, 71, 87, 97, 110, 49, 92, 101, 90, 85, 62, 91, 61, 71, 54, 73, 70, 68, 49, 75, 73, 59, 38, 60, 42],
    params: { variables: ["annual_frost_days", "frost_after_budburst"], region: "burgundy", start: 2001, end: 2026, thresholds: {} },
  },
];

const STEPS = [
  ["변수 고르기", "서리, 폭염, 수확기 비 같은 지표 949개 중 최대 3개. 걱정을 문장으로 쓰면 AI가 골라 줍니다."],
  ["산지와 기간", "산지 7곳, 2001–2026년. 밭의 발아·수확 날짜를 넣으면 그 시기로 다시 계산합니다."],
  ["추세 계산", "연도별 값에 Sen 기울기와 95% 신뢰구간을 구해 10년당 변화로 보여 줍니다."],
  ["판정과 검증", "두 가지 검정, 가장 튄 해를 뺀 재검정, 지상 관측소·위성 비교까지 거칩니다."],
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
  { id: "core", name: "핵심 지표", n: 100, d: "서리일수, 적산온도, 병해 위험일처럼 정의와 근거를 사람이 하나씩 쓴 지표", wide: true },
  { id: "etccdi", name: "기후 극값 지수", n: 27, d: "세계기상기구 표준(ETCCDI). 논문 속 다른 지역 결과와 바로 비교", wide: true },
  { id: "extremes", name: "평년 대비 극값 일수", n: 100, d: "2001–2010년 기준 상위·하위 10% 날이 얼마나 잦아졌는지" },
  { id: "stats", name: "월·계절 기본 통계", n: 722, d: "달·계절·생육 단계별 기온, 강수, 습도, 토양수분, 일사, 바람" },
  { id: "ai", name: "질문으로 찾기", n: null, d: "‘봄 서리가 걱정돼’처럼 쓰면 맞는 지표를 바구니에 담아 줌" },
] as const;

const FAQ = [
  ["‘유의함’은 무슨 뜻인가요?", "추세가 없다고 가정할 때 이만한 변화가 우연히 나올 확률(p값)이 5% 미만이라는 뜻입니다. Mann-Kendall과 t-검정이 모두 이 기준을 넘어야 ‘유의함’, 하나만 넘으면 ‘엇갈림’으로 판정합니다."],
  ["10년당 변화는 어떻게 구하나요?", "연도별 값에 맞춘 직선의 기울기에 10을 곱한 값입니다. 튀는 해가 많은 지표는 중앙값 기반의 Sen 기울기를 씁니다."],
  ["우리 밭에도 그대로 맞나요?", "아닙니다. 값은 약 50km 격자의 평균입니다. 결과 화면의 관측소·위성 검증에서 격자와 실제 관측의 차이를 볼 수 있습니다."],
  ["자료는 어디서 오나요?", "NASA POWER(MERRA-2·CERES) 일별 자료, MODIS 위성, GPM IMERG 강수, GLDAS 토양수분입니다. 연기 지표 2개(AIRS·OMI)는 아직 실제 집계가 없어 예시 값을 쓰고, 결과 화면에 표시됩니다."],
  ["AI 해설은 믿어도 되나요?", "AI는 통계 엔진이 미리 계산한 숫자만 쓰도록 묶여 있습니다. 답에 엔진에 없는 숫자가 나오면 따로 표시합니다."],
];

const SOURCES = ["MERRA-2", "CERES", "MODIS", "GPM IMERG", "GLDAS", "NASA POWER", "AIRS", "OMI"];

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
  const slope = 12.354; // °C·일 / 년 (10년당 +123.5)
  const rest = GDD.map((v, i) => v - slope * i).sort((a, b) => a - b);
  const b = (rest[12] + rest[13]) / 2;
  return (
    <figure className="preview" aria-label="충북 영동 생육기 적산온도 2001–2026, 10년에 123.5°C·일 증가, 유의함">
      <figcaption>
        <span className="tag">기온·서리</span>
        <span>충북 영동 · 생육기 적산온도</span>
      </figcaption>
      <p className="preview-num num">
        +123.5<small>°C·일 / 10년</small>
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
        <span className="pill-sm on">증가, 유의함</span>
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
    <svg className="globe" viewBox="0 15 360 135" role="img" aria-label={`산지 ${regions.length}곳 위치: ${regions.map((r) => r.name).join(", ")}`}>
      {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lon) => (
        <line key={lon} className="grat" x1={X(lon)} x2={X(lon)} y1={15} y2={150} />
      ))}
      {[60, 30, -30].map((lat) => (
        <line key={lat} className="grat" x1={0} x2={360} y1={Y(lat)} y2={Y(lat)} />
      ))}
      <line className="equator" x1={0} x2={360} y1={90} y2={90} />
      <text className="glabel" x={4} y={87}>
        적도
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
      {/* 첫 화면: 가운데 제목 + 뒤에 영동 적산온도 기후 줄무늬 (한 줄 = 한 해) */}
      <section className="hero">
        <Stripes values={GDD} className="hero-stripes" />
        <div className="hero-copy">
          <img className="hero-mark" src="/logo-wordmark-white.png" width={150} height={43} alt="Vinus" />
          <h1>
            우리 산지의 기후 변화,
            <br />
            체감 말고 NASA 데이터로
          </h1>
          <p>산지 7곳의 2001–2026년 위성·재분석 자료로 서리, 더위, 비, 병해 위험이 정말 변하고 있는지 계산합니다.</p>
          <div className="row-btns">
            <Link className="btn primary" to="/variables">
              분석 시작
            </Link>
            <button className="btn secondary" onClick={() => openDemo(DEMOS[0])}>
              예시 보기
            </button>
          </div>
        </div>
        <p className="stripes-note">배경 줄무늬: 충북 영동 생육기 적산온도, 2001년(왼쪽)부터 2026년까지. 밝을수록 더운 해.</p>
      </section>

      <section className="wrap intro">
        <p className="label">와인 기후 추세 탐정</p>
        <p className="intro-text">
          해마다 ‘올해는 유난히 덥다’는 말을 듣습니다. Vinus는 그 느낌이 실제 추세인지, 몇 해의 우연인지를 NASA 자료와 통계 검정으로 가려 줍니다. 생산자가 품종, 방제, 수확 시기, 시설 투자를 정할 때 쓸 수 있게요.
        </p>
        <ul className="sources" aria-label="사용 자료">
          {SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="wrap steps">
        <div>
          <p className="label">이렇게 계산합니다</p>
          <h2>
            느낌을 숫자로,
            <br />
            숫자를 판정으로
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

      {/* 산지 7곳 좌표 + 세 가지 확인 */}
      <section className="wrap checks-sec">
        <p className="label center">통계 엔진</p>
        <h2 className="center">
          추세가 진짜인지
          <br />세 번 확인합니다
        </h2>
        <p className="lead center">AI는 엔진이 계산한 숫자만 해설합니다. 숫자를 지어내지 않습니다.</p>
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
              ["tests", "두 가지 검정", "Mann-Kendall과 t-검정이 모두 p < 0.05일 때만 ‘유의함’."],
              ["leave", "한 해 빼고 다시", "가장 튄 해를 빼도 결론이 같은지 다시 계산합니다."],
              ["ground", "땅 위 관측과 비교", "근처 기상 관측소와 1km 위성으로 격자 값을 점검합니다."],
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
            <p className="label">지표 묶음</p>
            <h2>
              지표 949개,
              <br />
              네 가지 묶음
            </h2>
          </div>
          <p className="sec-aside">핵심 지표는 정의와 근거를 하나씩 쓴 것, 나머지는 같은 원자료로 만든 표준 지수입니다.</p>
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
            <p className="label">예시 분석</p>
            <h2>이런 질문에 답합니다</h2>
          </div>
          <Link className="btn primary" to="/variables">
            직접 고르기
          </Link>
        </div>
        <div className="demo-grid">
          {DEMOS.map((d) => (
            <article key={d.q} className="demo">
              <MiniBars values={d.values} label={`${d.region} 해마다 값, ${d.fact}`} />
              <div className="demo-meta">
                <span className="tag">{d.tag}</span>
                <span>{d.region}</span>
              </div>
              <h3>{d.q}</h3>
              <p className="demo-fact">{d.fact}</p>
              <button className="btn primary sm" onClick={() => openDemo(d)}>
                결과 보기
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap faq">
        <div>
          <p className="label">자주 묻는 질문</p>
          <h2>
            결과를
            <br />
            읽기 전에
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
        <p>NASA Space Apps Challenge 2026 서울, 과제 ‘Be An Earth System Trend Detective’. 팀 율촌.</p>
        <p className="muted">결과는 산지 단위(약 50km) 평균이며 개별 밭을 대표하지 않습니다.</p>
      </footer>
    </main>
  );
}
