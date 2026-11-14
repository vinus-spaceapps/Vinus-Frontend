import { pText, signed } from "../lib/format";
import type { VariableResult } from "../lib/types";
import { Card, Seg } from "./DashCards";

function detectText(r: VariableResult): string | null {
  const d = r.stats.detectable;
  if (!d) return null;
  if (d.status === "need_more") return `지금 기울기가 이어지면 약 ${d.more_years}년 더 관측해야 유의해질 수 있음 (근사, 총 ${d.total_years}년)`;
  if (d.status === "length_enough") return "관측 기간은 충분한 편이라, 실제 변화는 지금 기울기보다 작거나 없을 수 있음";
  return "기울기가 0에 가까워 탐지 가능 연수를 추정할 수 없음";
}

// 검정 상세: Figma Statistic 카드 (제목·설명 / 본문 / 아래 '기준값' 이름표 + 알약 칩 줄)
export default function VerdictCard({ r, onThreshold }: { r: VariableResult; onThreshold: (value: number) => void }) {
  const st = r.stats;
  const v = r.variable;
  const unit = v.unit;
  const det = detectText(r);
  const opts = v.threshold_options.length > 1 ? v.threshold_options : null;

  return (
    <Card
      title="검정 상세"
      desc="p값: 추세가 없다고 가정할 때 이만한 변화가 우연히 나올 확률"
      footer={
        opts && (
          <div className="foot-seg">
            <span className="muted">기준값 ({v.condition})</span>
            <Seg
              label="기준값"
              options={opts.map((o) => ({ id: String(o), label: `${o}${v.threshold_unit}` }))}
              value={String(r.threshold)}
              onChange={(id) => onThreshold(Number(id))}
            />
          </div>
        )
      }
    >
      <dl className="vd">
        <dt>기울기 방법</dt>
        <dd>{st.method === "sen" ? "Sen (튀는 해에 덜 흔들림)" : "OLS 최소제곱"}</dd>
        <dt>Sen 기울기</dt>
        <dd className="num">
          {signed(st.sen.slope_per_decade)}
          {unit} / 10년
        </dd>
        <dt>OLS 기울기</dt>
        <dd className="num">
          {signed(st.ols.slope_per_decade)}
          {unit} / 10년
        </dd>
        <dt>Mann-Kendall</dt>
        <dd className="num">
          {pText(st.mk.p)} (tau {st.mk.tau.toFixed(2)})
        </dd>
        <dt>t-검정</dt>
        <dd className="num">{pText(st.ols.p)}</dd>
        <dt>자기상관 보정</dt>
        <dd className="num">{pText(st.ols.p_ar1)}</dd>
        <dt>연수</dt>
        <dd className="num">{st.n}년</dd>
      </dl>

      {det && <p className="flag info">{det}</p>}
      {st.flags.includes("tests_disagree") && <p className="flag">t-검정과 Mann-Kendall 결과가 다름. 일부 해의 큰 값이 기울기에 영향을 줬을 수 있음.</p>}
      {st.flags.includes("one_year_drives_result") && (
        <p className="flag">
          가장 튄 {st.leave_out.year}년을 빼면 판정이 '{st.leave_out.verdict.label}'. 한 해가 결과를 좌우함.
        </p>
      )}
      {!st.flags.includes("one_year_drives_result") && st.verdict.status === "significant" && <p className="flag info">가장 튄 {st.leave_out.year}년을 빼도 판정 같음.</p>}
      {st.flags.includes("autocorrelation_weakens") && <p className="flag">자기상관 보정 시 t-검정 {pText(st.ols.p_ar1)} (유의성 약해짐).</p>}
      {r.overlay && (
        <p className="flag info">
          {r.overlay.label}와의 상관:{" "}
          {r.overlay.correlation
            ? `r = ${r.overlay.correlation.r.toFixed(2)} (${pText(r.overlay.correlation.p)}, ${r.overlay.correlation.n}개 연도)`
            : `겹치는 연도가 ${r.overlay.common_years}개라 계산하지 않음`}
          . {r.overlay.note}
        </p>
      )}
      {r.notes.length > 0 && (
        <ul className="notes">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
