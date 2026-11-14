import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useCatalog } from "./lib/catalog";
import { useSelection } from "./lib/selection";
import Landing from "./pages/Landing";
import VariablePicker from "./pages/VariablePicker";
import RegionSetup from "./pages/RegionSetup";
import Analysis from "./pages/Analysis";
import { setTheme, useTheme } from "./theme";

function Header() {
  const { pathname } = useLocation();
  const { health } = useCatalog();
  const { sel } = useSelection();
  const theme = useTheme();
  const steps = [
    { to: "/variables", n: 1, label: "변수 고르기", enabled: true },
    { to: "/region", n: 2, label: "지역 설정", enabled: sel.basket.length > 0 },
    { to: "/analyze", n: 3, label: "분석", enabled: pathname === "/analyze" },
  ];
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand">
          <img src="/logo.svg" width={40} height={28} alt="" />
          Vinus <small>와인 기후 추세 탐정</small>
        </Link>
        {pathname !== "/" && (
          <nav className="seg steps" aria-label="진행 단계">
            {steps.map((s) =>
              s.enabled ? (
                <NavLink key={s.to} to={s.to}>
                  <span className="n num">{s.n}</span>
                  <span className="txt">{s.label}</span>
                </NavLink>
              ) : (
                <span key={s.to} aria-disabled="true">
                  <span className="n num">{s.n}</span>
                  <span className="txt">{s.label}</span>
                </span>
              ),
            )}
          </nav>
        )}
        {health && (
          <span className={`badge ${health.ai.enabled ? "" : "warn"}`} title={health.ai.enabled ? health.ai.model : health.ai.reason}>
            AI {health.ai.enabled ? "켜짐" : "꺼짐 · 규칙 기반"}
          </span>
        )}
        <div className="seg theme-seg" role="group" aria-label="화면 테마">
          <button aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
            다크
          </button>
          <button aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
            라이트
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const { error, loading } = useCatalog();
  return (
    <>
      <Header />
      {error ? (
        <div className="container page">
          <div className="error-box">
            <b>데이터를 불러오지 못했어요.</b> {error}
          </div>
        </div>
      ) : loading ? (
        <div className="container page empty">
          <span className="spinner" /> 불러오는 중…
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
    </>
  );
}
