import { pText, signed } from "../lib/format";
import type { Region, VariableResult } from "../lib/types";

interface Props {
  r: VariableResult;
  region: Region;
  onThreshold: (value: number) => void;
}

function detectText(r: VariableResult): string | null {
  const d = r.stats.detectable;
  if (!d) return null;
  if (d.status === "need_more") return `현재 추세가 유지되면 약 ${d.more_years}년 더 관측해야 유의해질 수 있음 (근사, 총 ${d.total_years}년)`;
  if (d.status === "length_enough") return "관측 기간은 충분한 편이라, 실제 변화는 지금 기울기보다 작거나 없을 수 있음";
  return "기울기가 0에 가까워 탐지 가능 연수를 추정할 수 없음";
}

// 판정 카드: 엔진 숫자를 쉬운 말로.
export default function VerdictCard({ r, onThreshold }: Props) {
  const st = r.stats;
  // 상태는 색이 아니라 배지 모양으로: 유의 = 흰 채움, 엇갈림 = 점선, 유의하지 않음 = 얇은 선
  const badge = st.verdict.status === "significant" ? "sig" : st.verdict.status === "mixed" ? "warn" : "";
  const unit = r.variable.unit;
  const [lo, hi] = st.ci_per_decade;
  const det = detectText(r);
  const v = r.variable;

  return (
    <section className="verdict">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <span className="where">
          {v.name}, {r.start}–{r.end}년
        </span>
        <span className={r.is_mock ? "demo-flag" : "badge"} title={r.source_note}>
          {r.is_mock ? "예시 데이터" : "NASA 집계"}
        </span>
      </div>
      <h3 className="v-label">{st.verdict.label}</h3>
      <div className="stat-head">
        <span className="stat-big">{signed(st.slope_per_decade)}</span>
        <span className="muted">{unit} / 10년</span>
        <span className={`badge ${badge}`}>Mann-Kendall {pText(st.mk.p)}</span>
      </div>
      <p className="muted small">
        95% 신뢰구간 {signed(lo)} ~ {signed(hi)}
        {unit}
      </p>
      <dl>
        <dt>기울기 방법</dt>
        <dd>{st.method === "sen" ? "Sen (튀는 해에 덜 흔들림)" : "OLS 최소제곱"}</dd>
        <dt>Mann-Kendall</dt>
        <dd>{pText(st.mk.p)}</dd>
        <dt>t-검정 (기울기≠0)</dt>
        <dd>{pText(st.ols.p)}</dd>
        <dt>초기 → 최근</dt>
        <dd>
          {st.early.mean.toFixed(1)} → {st.late.mean.toFixed(1)}
          {unit} ({st.early.from}~{st.early.to} vs {st.late.from}~{st.late.to})
        </dd>
      </dl>
      <p className="muted small">p값은 추세가 없을 때 이만한 변화가 우연히 나올 확률입니다.</p>

      {det && <div className="flag info">{det}</div>}
      {st.flags.includes("tests_disagree") && <div className="flag">t-검정과 Mann-Kendall 결과가 엇갈립니다. 몇몇 해의 큰 값이 기울기를 끌어올렸을 수 있어요.</div>}
      {st.flags.includes("one_year_drives_result") && (
        <div className="flag">
          가장 튄 {st.leave_out.year}년을 빼면 판정이 '{st.leave_out.verdict.label}'(으)로 바뀝니다. 한 해가 결과를 좌우하고 있어요.
        </div>
      )}
      {!st.flags.includes("one_year_drives_result") && st.verdict.status === "significant" && (
        <div className="flag info">가장 튄 {st.leave_out.year}년을 빼도 판정은 그대로예요.</div>
      )}
      {st.flags.includes("autocorrelation_weakens") && (
        <div className="flag">해마다 값이 이어지는 경향(자기상관)을 보정하면 t-검정 {pText(st.ols.p_ar1)}로 유의성이 약해집니다.</div>
      )}

      {v.threshold_options.length > 1 && (
        <div className="threshold-row">
          <span className="muted">기준값</span>
          {v.threshold_options.map((o) => (
            <button key={o} className="chip" aria-pressed={r.threshold === o} onClick={() => onThreshold(o)}>
              {o}
              {v.threshold_unit}
            </button>
          ))}
        </div>
      )}

      {r.overlay && (
        <div className="flag info">
          {r.overlay.label}와의 상관:{" "}
          {r.overlay.correlation
            ? `r = ${r.overlay.correlation.r.toFixed(2)} (${pText(r.overlay.correlation.p)}, ${r.overlay.correlation.n}개 연도)`
            : `겹치는 연도가 ${r.overlay.common_years}개라 계산하지 않음`}
          . {r.overlay.note}
        </div>
      )}
      {r.notes.length > 0 && (
        <ul className="notes muted small">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
