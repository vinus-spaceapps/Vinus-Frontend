import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import Icon, { type IconName } from "./components/Icon";
import { useCatalog } from "./lib/catalog";
import { useSelection } from "./lib/selection";
import Landing from "./pages/Landing";
import VariablePicker from "./pages/VariablePicker";
import RegionSetup from "./pages/RegionSetup";
import Analysis from "./pages/Analysis";
import { setTheme, useTheme } from "./theme";

// 왼쪽 아이콘 레일: 로고, 진행 단계, 테마. 선택된 칸 = 진한 원.
function Rail() {
  const { pathname } = useLocation();
  const { sel } = useSelection();
  const theme = useTheme();
  const items: { to: string; label: string; icon: IconName; enabled: boolean }[] = [
    { to: "/", label: "처음", icon: "home", enabled: true },
    { to: "/variables", label: "1 변수 선택", icon: "layers", enabled: true },
    { to: "/region", label: "2 지역·기간", icon: "pin", enabled: sel.basket.length > 0 },
    { to: "/analyze", label: "3 분석 결과", icon: "chart", enabled: pathname === "/analyze" },
  ];
  return (
    <aside className="rail">
      <Link to="/" className="rail-logo" aria-label="Vinus 처음 화면">
        <img src="/logo.svg" width={40} height={28} alt="" />
      </Link>
      <nav className="rail-nav" aria-label="진행 단계">
        {items.map((it) =>
          it.enabled ? (
            <NavLink key={it.to} to={it.to} end className="rail-btn" aria-label={it.label}>
              <Icon name={it.icon} />
              <span className="rail-tip">{it.label}</span>
            </NavLink>
          ) : (
            <span key={it.to} className="rail-btn" aria-disabled="true" aria-label={`${it.label} (이전 단계를 먼저 완료)`}>
              <Icon name={it.icon} />
              <span className="rail-tip">{it.label}</span>
            </span>
          ),
        )}
      </nav>
      <div className="rail-end">
        <button className="rail-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "라이트 테마로" : "다크 테마로"}>
          <Icon name={theme === "dark" ? "sun" : "moon"} />
          <span className="rail-tip">{theme === "dark" ? "라이트 테마" : "다크 테마"}</span>
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const { error, loading } = useCatalog();
  return (
    <div className="shell">
      <Rail />
      <div className="shell-main">
        {error ? (
          <div className="page">
            <div className="error-box">
              <b>데이터를 불러올 수 없습니다.</b> {error}
            </div>
          </div>
        ) : loading ? (
          <div className="page empty">
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
      </div>
    </div>
  );
}
