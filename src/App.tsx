import type { CSSProperties } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import Icon, { type IconName } from "./components/Icon";
import { useCatalog } from "./lib/catalog";
import { toSearch, useSelection } from "./lib/selection";
import Landing from "./pages/Landing";
import VariablePicker from "./pages/VariablePicker";
import RegionSetup from "./pages/RegionSetup";
import Analysis from "./pages/Analysis";

const STEP_PATHS = ["/variables", "/region", "/analyze"];

// 왼쪽 레일: 로고·처음은 따로, 1→2→3 단계는 한 캡슐 안에서 선으로 이어진 진행 표시.
// 지나온 단계는 와인색 체크, 지금 단계는 진한 원, 아직 못 가는 단계는 흐리게.
function Rail() {
  const { pathname } = useLocation();
  const { sel } = useSelection();
  const cur = STEP_PATHS.indexOf(pathname);
  const canAnalyze = sel.basket.length > 0 && !!sel.region;
  const steps = [
    { to: "/variables", label: "변수", icon: "layers" as IconName, enabled: true },
    { to: "/region", label: "지역·기간", icon: "pin" as IconName, enabled: sel.basket.length > 0 },
    {
      to: canAnalyze ? `/analyze${toSearch({ variables: sel.basket, region: sel.region!, start: sel.start, end: sel.end, thresholds: {} })}` : "/analyze",
      label: "결과",
      icon: "chart" as IconName,
      enabled: pathname === "/analyze" || canAnalyze,
    },
  ];
  return (
    <aside className="rail">
      <Link to="/" className="rail-logo" aria-label="Vinus 처음 화면">
        <img src="/logo.svg" width={40} height={28} alt="" />
      </Link>
      <Link to="/" className="rail-home" {...(pathname === "/" ? { "aria-current": "page" } : {})}>
        <span className="rail-home-ic">
          <Icon name="home" size={22} />
        </span>
        <span className="step-label">처음</span>
      </Link>
      <nav className="stepper" aria-label="진행 단계" style={{ "--reached": cur } as CSSProperties}>
        <ol>
          {steps.map((s, i) => {
            const state = i === cur ? "current" : i < cur ? "done" : s.enabled ? "open" : "locked";
            // Figma Collapsed Nav 처럼 아이콘(24). 지나온 단계는 체크, 이름표에 순서 번호
            const mark = <Icon name={state === "done" ? "check" : s.icon} size={22} />;
            return (
              <li key={s.label} data-state={state} {...(i < cur ? { "data-reached": "" } : {})}>
                {s.enabled ? (
                  <Link to={s.to} className="step-node" aria-label={`${i + 1}단계 ${s.label}`} {...(i === cur ? { "aria-current": "step" } : {})}>
                    {mark}
                  </Link>
                ) : (
                  <span className="step-node" aria-disabled="true" aria-label={`${i + 1}단계 ${s.label}, 앞 단계를 먼저 마치세요`}>
                    {mark}
                  </span>
                )}
                <span className="step-label" aria-hidden>
                  {i + 1} {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
      <Link to="/variables" className="rail-cta" aria-label="새 분석 시작" title="새 분석 시작">
        <Icon name="plus" size={18} />
      </Link>
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
