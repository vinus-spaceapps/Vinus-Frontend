import { useNavigate } from "react-router-dom";
import { Card, Media } from "../components/DashCards";
import Icon from "../components/Icon";
import { toSearch, useSelection } from "../lib/selection";

// 예시: 실제 자료(2001–2026)에서 고른 질문. 유의하지 않은 경우(싹튼 뒤 서리)도 일부러 넣음.
const DEMOS = [
  {
    region: "충북 영동",
    country: "대한민국",
    q: "덥고 습한 날이 늘었나?",
    note: "노균병·탄저병 방제 계획",
    params: { variables: ["hot_humid_days", "tropical_nights"], region: "yeongdong", start: 2001, end: 2026, thresholds: {} },
  },
  {
    region: "보르도",
    country: "프랑스",
    q: "수확기 밤이 더워졌나?",
    note: "산도 유지, 수확 시기 판단",
    params: { variables: ["harvest_warm_nights", "harvest_tmin_mean"], region: "bordeaux", start: 2001, end: 2026, thresholds: {} },
  },
  {
    region: "부르고뉴",
    country: "프랑스",
    q: "서리는 줄었는데, 싹튼 뒤 서리도?",
    note: "서리 대비 시설 투자 검토",
    params: { variables: ["annual_frost_days", "frost_after_budburst"], region: "burgundy", start: 2001, end: 2026, thresholds: {} },
  },
];

const DATASETS = ["MERRA-2", "CERES", "MODIS", "GPM IMERG", "GLDAS", "AIRS", "OMI"];

// 미리 보기: 영동 '덥고 습한 날' 실제 값 (2001–2026). Sen 기울기 +9.7일/10년, Mann-Kendall p < 0.001
const PREVIEW = [20, 15, 3, 22, 12, 23, 23, 21, 2, 27, 8, 23, 25, 11, 16, 26, 26, 25, 25, 18, 19, 33, 28, 56, 39, 41];
const SLOPE = 0.969;

function PreviewBars() {
  const max = Math.max(...PREVIEW);
  const top = max * 1.08;
  // Sen 절편 = (값 - 기울기×순서)의 중앙값
  const rest = PREVIEW.map((v, i) => v - SLOPE * i).sort((a, b) => a - b);
  const b = (rest[12] + rest[13]) / 2;
  const y = (v: number) => 100 - (v / top) * 100;
  return (
    <div className="pv" aria-label="2001년부터 2026년까지 덥고 습한 날 막대 그래프, 2024년 56일이 가장 큼">
      <div className="pv-plot">
        <span className="pv-max" style={{ top: `${y(max)}%` }}>
          <b>MAX 2024</b>
        </span>
        {PREVIEW.map((v, i) => (
          <i key={i} style={{ height: `${(v / top) * 100}%` }} {...(v === max ? { "data-peak": "" } : {})} />
        ))}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <line x1={100 / 52} y1={y(b)} x2={100 - 100 / 52} y2={y(b + SLOPE * 25)} />
        </svg>
      </div>
      <div className="pv-years" aria-hidden>
        <span>2001</span>
        <span>2010</span>
        <span>2020</span>
        <span>2026</span>
      </div>
    </div>
  );
}

export default function Landing() {
  const nav = useNavigate();
  const { set } = useSelection();

  const openDemo = (d: (typeof DEMOS)[number]) => {
    set({ basket: d.params.variables, region: d.params.region, start: d.params.start, end: d.params.end });
    nav(`/analyze${toSearch(d.params)}`);
  };

  return (
    <main className="page landing">
      <section className="hero">
        <div className="hero-copy">
          <img className="wordmark" src="/logo-wordmark.png" width={180} height={52} alt="Vinus" />
          <h1>
            우리 산지의 기후 변화,
            <br />
            체감 말고 NASA 데이터로
          </h1>
          <p className="lead">산지 7곳, 2001–2026년. 서리·더위·비·병해 위험 지표 949개의 연도별 추세와 통계적 유의성을 계산합니다.</p>
          <div className="hero-cta">
            <button className="btn pill lg" onClick={() => nav("/variables")}>
              시작하기
            </button>
            <button className="btn outline-pill lg" onClick={() => openDemo(DEMOS[0])}>
              예시 보기
            </button>
          </div>
        </div>

        {/* $890.93 카드: 큰 값 + 차트 버튼 / 둥근 막대, 가장 큰 해만 진하게 + MAX 점선 */}
        <section className="card hero-card">
          <header className="card-head">
            <div className="card-titles">
              <p className="card-meta">충북 영동 · 덥고 습한 날 (실제 값)</p>
              <p className="big num">
                +9.7일 <small>/ 10년</small>
              </p>
              <p className="card-desc">2001–2026 · 증가, 유의함 · Mann-Kendall p &lt; 0.001</p>
            </div>
            <span className="chart-btn" aria-hidden>
              <Icon name="bars" size={24} />
            </span>
          </header>
          <div className="card-body">
            <PreviewBars />
          </div>
        </section>
      </section>

      <section className="how" aria-label="이용 순서">
        {[
          ["변수 고르기", "핵심 지표 100개와 표준 극값 지수 등 949개 중 최대 3개. 검색·AI 추천."],
          ["산지·기간", "산지 7곳, 2001–2026년. 밭의 발아·수확 날짜를 넣으면 그 시기로 계산."],
          ["추세 판정", "10년당 변화, 95% 신뢰구간, Mann-Kendall·t-검정, 관측소·위성 검증."],
        ].map(([t, d], i) => (
          <Card key={t} title={t} desc={d} action={<span className="ic static num">{i + 1}</span>} />
        ))}
      </section>

      <h2 className="section-h">이런 질문에 답합니다</h2>
      <section className="demo-grid">
        {DEMOS.map((d) => (
          <Card key={d.region} title={d.q} desc={d.note} className="demo-card">
            <Media
              name={d.region}
              sub={d.country}
              option={
                <button className="btn outline-pill sm" onClick={() => openDemo(d)}>
                  결과 보기
                </button>
              }
            />
          </Card>
        ))}
      </section>

      <footer className="footer">
        <span>사용 자료</span>
        <div className="seg static">
          {DATASETS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <p>NASA Space Apps Challenge 2026 서울 · Be An Earth System Trend Detective · 팀 율촌</p>
        <p>연기 지표 2개(AIRS·OMI)는 아직 실제 집계가 없어 예시 값을 씁니다. 결과 화면에 표시됩니다.</p>
      </footer>
    </main>
  );
}
