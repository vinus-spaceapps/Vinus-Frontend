import { Link, Route, Routes, useLocation } from "react-router-dom";
import { useCatalog } from "./lib/catalog";
import Landing from "./pages/Landing";
import VariablePicker from "./pages/VariablePicker";
import RegionSetup from "./pages/RegionSetup";
import Analysis from "./pages/Analysis";

// 내비게이션은 따로 두지 않음: 첫 화면 '분석 시작'부터 변수 → 산지·기간 → 결과로 이어짐.
// 하위 화면에서는 왼쪽 위 작은 로고만 처음 화면으로 돌아가는 길.
export default function App() {
  const { error, loading } = useCatalog();
  const { pathname } = useLocation();
  return (
    <div className="app">
      {pathname !== "/" && (
        <Link to="/" className="home-link" aria-label="처음 화면">
          <img src="/logo-mark-rose.png" width={34} height={25} alt="" />
          <span>Vinus</span>
        </Link>
      )}
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
  );
}
