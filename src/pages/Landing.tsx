import type React from "react";
import { useNavigate } from "react-router-dom";
import { toSearch, useSelection } from "../lib/selection";

const DEMOS = [
  {
    where: "미국 오리건 로그 밸리",
    q: "수확기 연기가 늘고 있나?",
    who: "와이너리에 포도를 파는 계약 재배자",
    params: { variables: ["harvest_smoke_days", "harvest_aerosol_days"], region: "rogue_valley", start: 2003, end: 2025, thresholds: {} },
  },
  {
    where: "프랑스 부르고뉴",
    q: "싹튼 뒤 서리는 줄었나?",
    who: "서리 대비 시설 투자를 고민하는 재배자",
    params: { variables: ["frost_after_budburst"], region: "burgundy", start: 2003, end: 2025, thresholds: {} },
  },
  {
    where: "충북 영동",
    q: "수확기 비가 잦아졌나?",
    who: "수확 일정을 짜는 국내 생산자",
    params: { variables: ["harvest_rain_days"], region: "yeongdong", start: 2003, end: 2025, thresholds: {} },
  },
];

const DATASETS = ["MODIS", "OMI", "AIRS", "GPM IMERG", "MERRA-2", "GLDAS"];

function HeroVisual() {
  // 장식용 그림: 해마다 튀는 점 + 위로 기우는 추세선. 분석 그래프와 같은 문법(전경색 점·선, 점선 추세, 가장 튄 해만 링)
  // 랜딩에서 단 한 번 움직임: 점이 찍히고, 추세선이 그어지고, 결과가 뜬다 (탐정이 추세를 찾아내는 순서)
  const pts = [3, 2, 4, 3, 5, 3, 4, 6, 4, 5, 7, 5, 6, 9, 6, 8, 12, 7, 9, 8, 10, 9, 11];
  const peak = pts.indexOf(Math.max(...pts));
  const w = 400, h = 300, padX = 28, top = 34, bottom = 196; // 아래쪽은 글자 자리
  const x = (i: number) => padX + (i * (w - 2 * padX)) / (pts.length - 1);
  const y = (v: number) => bottom - (v * (bottom - top)) / 13;
  return (
    <div className="hero-visual" aria-hidden>
      <svg viewBox={`0 0 ${w} ${h}`}>
        {[0, 4, 8, 12].map((v) => (
          <line key={v} x1={padX} x2={w - padX} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.1} />
        ))}
        <path d={pts.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ")} fill="none" stroke="currentColor" strokeOpacity={0.3} strokeWidth={1.5} />
        <line className="hv-trend" x1={x(0)} y1={y(2.6)} x2={x(pts.length - 1)} y2={y(10.6)} stroke="currentColor" strokeWidth={2.5} strokeDasharray="8 6" strokeLinecap="round" />
        {pts.map((v, i) =>
          i === peak ? (
            <circle key={i} className="hv-dot" style={{ "--i": i, fill: "var(--raise)" } as React.CSSProperties} cx={x(i)} cy={y(v)} r={6} stroke="currentColor" strokeWidth={2} />
          ) : (
            <circle key={i} className="hv-dot" style={{ "--i": i } as React.CSSProperties} cx={x(i)} cy={y(v)} r={3.5} fill="currentColor" />
          ),
        )}
      </svg>
      <span className="hv-label">로그 밸리의 수확기 연기 노출일수</span>
      <span className="hv-value">
        10년에 +4일 <span className="badge sig">유의함</span> <span className="demo-flag">예시</span>
      </span>
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
    <>
      <main className="container">
        <section className="hero">
          <div>
            <h1>
              우리 산지의 기후 변화,
              <br />
              체감이 아니라 NASA 데이터로
              <br />
              확인하세요
            </h1>
            <p className="lead">
              서리·폭염·수확기 비·산불 연기가 정말 늘고 있는지, 위성과 기후 모델 자료로 해마다 숫자를 뽑아 추세가 우연이 아닌지 통계로
              판정해 드립니다.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-lg" onClick={() => nav("/variables")}>
                내 산지 확인하기
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => openDemo(DEMOS[0])}>
                예시 결과 보기
              </button>
            </div>
          </div>
          <HeroVisual />
        </section>

        <section className="how" aria-label="이용 순서">
          <div className="how-step">
            <div className="n">1</div>
            <h3>변수 고르기</h3>
            <p className="muted small">걱정되는 것을 고르거나 AI에게 말하면 맞는 지표를 담아 줍니다. 카드에 마우스를 올리면 쉬운 설명이 나와요.</p>
          </div>
          <div className="how-step">
            <div className="n">2</div>
            <h3>지역 설정</h3>
            <p className="muted small">지도에서 산지를 고르고 기간을 정합니다. 우리 밭의 발아·수확 날짜를 넣을 수도 있어요.</p>
          </div>
          <div className="how-step">
            <div className="n">3</div>
            <h3>추세 판정</h3>
            <p className="muted small">연도별 그래프와 함께 10년당 변화량, 신뢰구간, 유의성(t-검정·Mann-Kendall)을 쉬운 말로 보여 줍니다.</p>
          </div>
        </section>

        <h2 className="section-h">시연 예시</h2>
        <section className="demo-grid">
          {DEMOS.map((d) => (
            <button key={d.where} className="glass demo-card" onClick={() => openDemo(d)}>
              <span className="where">{d.where}</span>
              <span className="q">{d.q}</span>
              <span className="muted small">{d.who}</span>
            </button>
          ))}
        </section>
      </main>
      <footer className="footer">
        <div className="container">
          <div>사용 데이터</div>
          <div className="datasets">
            {DATASETS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div>NASA Space Apps Challenge 2026 서울, Be An Earth System Trend Detective 과제. 팀 율촌</div>
          <div style={{ marginTop: 4 }}>현재 분석 결과는 예시 데이터(목업)이며, 실제 NASA 집계값으로 교체될 예정입니다.</div>
        </div>
      </footer>
    </>
  );
}
