import { Link, Route, Routes, useLocation } from "react-router-dom";
import Icon, { type IconName } from "./components/Icon";
import { useCatalog } from "./lib/catalog";
import { toSearch, useSelection } from "./lib/selection";
import Landing from "./pages/Landing";
import VariablePicker from "./pages/VariablePicker";
import RegionSetup from "./pages/RegionSetup";
import Analysis from "./pages/Analysis";

const STEP_PATHS = ["/variables", "/region", "/analyze"];
const TICKER = ["NASA 위성·재분석 자료 2001–2026", "산지 7곳", "지표 949개", "Mann-Kendall과 t-검정", "지상 관측소·1km 위성 검증", "AI 해설은 계산된 숫자만"];

// 위쪽 한 줄 공지 띠 (Starwave 의 announcement ticker). 같은 줄을 두 번 이어 붙여 끊김 없이 흐름
function Ticker() {
  const row = TICKER.map((t) => (
    <span key={t}>
      <i aria-hidden />
      {t}
    </span>
  ));
  return (
    <div className="ticker">
      <p className="sr-only">{TICKER.join(", ")}</p>
      <div className="ticker-track" aria-hidden>
        <div>{row}</div>
        <div>{row}</div>
      </div>
    </div>
  );
}

// 아래 떠 있는 독: 로고(처음) · 1 변수 · 2 산지·기간 · 3 결과 + 새 분석. 이름은 마우스·키보드 초점 때 위로 뜸
function Dock() {
  const { pathname } = useLocation();
  const { sel } = useSelection();
  const cur = STEP_PATHS.indexOf(pathname);
  const canAnalyze = sel.basket.length > 0 && !!sel.region;
  const steps: { to: string; label: string; icon: IconName; enabled: boolean }[] = [
    { to: "/variables", label: "1 변수", icon: "layers", enabled: true },
    { to: "/region", label: "2 산지·기간", icon: "pin", enabled: sel.basket.length > 0 },
    {
      to: canAnalyze ? `/analyze${toSearch({ variables: sel.basket, region: sel.region!, start: sel.start, end: sel.end, thresholds: {} })}` : "/analyze",
      label: "3 결과",
      icon: "bars",
      enabled: pathname === "/analyze" || canAnalyze,
    },
  ];
  return (
    <nav className="dock" aria-label="메뉴">
      <Link to="/" className="dock-item logo" aria-label="처음 화면" {...(pathname === "/" ? { "aria-current": "page" } : {})}>
        <img src="/logo-mark-rose.png" width={30} height={22} alt="" />
        <span className="dock-label">처음</span>
      </Link>
      {steps.map((s, i) =>
        s.enabled ? (
          <Link key={s.label} to={s.to} className="dock-item" aria-label={s.label} {...(i === cur ? { "aria-current": "step" } : {})}>
            <Icon name={s.icon} size={20} />
            <span className="dock-label">{s.label}</span>
          </Link>
        ) : (
          <span key={s.label} className="dock-item" aria-disabled="true" aria-label={`${s.label}, 앞 단계를 먼저 마치세요`} tabIndex={0}>
            <Icon name={s.icon} size={20} />
            <span className="dock-label">앞 단계 먼저</span>
          </span>
        ),
      )}
      <Link to="/variables" className="btn primary dock-cta">
        <Icon name="plus" size={16} />
        새 분석
      </Link>
    </nav>
  );
}

export default function App() {
  const { error, loading } = useCatalog();
  return (
    <>
      <Ticker />
      <div className="app">
        {error ? (
          <div className="wrap">
            <div className="error-box">
              <b>자료를 불러오지 못했습니다.</b> {error}
            </div>
          </div>
        ) : loading ? (
          <div className="wrap empty">
            <span className="spinner" /> 불러오는 중
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/variables" element={<VariablePicker />} />
            <Route path="/region" element={<RegionSetup />} />
            <Route path="/analyze" element={<Analysis />} />
            <Route path="*" element={<Landing />} />
          </Routes>
        )}
      </div>
      <Dock />
    </>
  );
}
