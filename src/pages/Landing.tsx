import { useNavigate } from "react-router-dom";
import { ChartCard, HeatmapGrid } from "../components/DashCards";
import Icon from "../components/Icon";
import { toSearch, useSelection } from "../lib/selection";

const DEMOS = [
  {
    where: "미국 오리건 로그 밸리",
    q: "수확기 연기가 늘고 있나?",
    who: "포도 계약 재배자",
    params: { variables: ["harvest_smoke_days", "harvest_aerosol_days"], region: "rogue_valley", start: 2003, end: 2025, thresholds: {} },
  },
  {
    where: "프랑스 부르고뉴",
    q: "싹튼 뒤 서리는 줄었나?",
    who: "서리 대비 시설 투자 검토",
    params: { variables: ["frost_after_budburst"], region: "burgundy", start: 2003, end: 2025, thresholds: {} },
  },
  {
    where: "충북 영동",
    q: "수확기 비가 잦아졌나?",
    who: "국내 생산자 수확 일정",
    params: { variables: ["harvest_rain_days"], region: "yeongdong", start: 2003, end: 2025, thresholds: {} },
  },
];

const DATASETS = ["MODIS", "OMI", "AIRS", "GPM IMERG", "MERRA-2", "GLDAS"];

// 미리 보기 카드용 예시 값 (2003–2025, 수확기 연기 노출일수 느낌)
const PREVIEW = [3, 2, 4, 3, 5, 3, 4, 6, 4, 5, 7, 5, 6, 9, 6, 8, 12, 7, 9, 8, 10, 9, 11].map((value, i) => ({ year: 2003 + i, value }));

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
          <h1>
            우리 산지의 기후 변화,
            <br />
            체감 말고 NASA 데이터로
          </h1>
          <p className="lead">NASA 위성·재분석 자료로 산지별 서리, 폭염, 수확기 강수, 산불 연기의 연도별 추세와 통계적 유의성을 계산합니다.</p>
          <div className="hero-cta">
            <button className="btn btn-primary btn-lg" onClick={() => nav("/variables")}>
              시작하기
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => openDemo(DEMOS[0])}>
              예시 보기
            </button>
          </div>
        </div>

        {/* 미리 보기: Figma 차트 카드 + Heatmap 컴포넌트 그대로 */}
        <ChartCard className="hero-card" meta="예시 데이터" title="로그 밸리 수확기 연기 노출일수" value="+4.0일 / 10년" sub="2003–2025, 증가·유의함 (Mann-Kendall p < 0.001)">
          <HeatmapGrid values={PREVIEW} higherIs="worse" unit="일" />
        </ChartCard>
      </section>

      <section className="how" aria-label="이용 순서">
        <div className="card how-step">
          <span className="n">1</span>
          <h3>변수 선택</h3>
          <p className="muted small">서리, 폭염, 강수 등 지표 최대 3개. AI 추천 지원.</p>
        </div>
        <div className="card how-step">
          <span className="n">2</span>
          <h3>지역·기간 설정</h3>
          <p className="muted small">산지와 분석 기간(2001년~) 선택. 밭의 발아·수확 날짜 입력 가능.</p>
        </div>
        <div className="card how-step">
          <span className="n">3</span>
          <h3>추세 판정</h3>
          <p className="muted small">연도별 그래프, 10년당 변화량, 95% 신뢰구간, t-검정·Mann-Kendall 유의성.</p>
        </div>
      </section>

      <h2 className="section-h">예시</h2>
      <section className="demo-grid">
        {DEMOS.map((d) => (
          <button key={d.where} className="card demo-card" onClick={() => openDemo(d)}>
            <span className="where">{d.where}</span>
            <span className="q">{d.q}</span>
            <span className="muted small">{d.who}</span>
            <span className="icon-btn go" aria-hidden>
              <Icon name="arrow" size={16} />
            </span>
          </button>
        ))}
      </section>

      <footer className="footer">
        <div>사용 데이터</div>
        <div className="datasets">
          {DATASETS.map((d) => (
            <span key={d} className="chip-num">
              {d}
            </span>
          ))}
        </div>
        <div>NASA Space Apps Challenge 2026 서울, Be An Earth System Trend Detective 과제. 팀 율촌</div>
        <div>현재 분석 결과는 예시 데이터(목업)입니다.</div>
      </footer>
    </main>
  );
}
