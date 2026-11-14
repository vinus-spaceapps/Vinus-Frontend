import { deltaUnit, pText, signed, unitText, withUnit } from "../lib/format";
import type { VariableResult } from "../lib/types";
import { Card, Seg } from "./DashCards";

function detectText(r: VariableResult): string | null {
  const d = r.stats.detectable;
  if (!d) return null;
  if (d.status === "need_more") return `If the current slope continues, about ${d.more_years} more years of data may be needed to reach significance (approx., ${d.total_years} years in total)`;
  if (d.status === "length_enough") return "The record is reasonably long, so the real change may be smaller than the current slope, or there may be none";
  return "The slope is close to 0, so the years needed to detect a trend can’t be estimated";
}

// 검정 상세: Figma Statistic 카드 (제목·설명 / 본문 / 아래 '기준값' 이름표 + 알약 칩 줄)
export default function VerdictCard({ r, onThreshold }: { r: VariableResult; onThreshold: (value: number) => void }) {
  const st = r.stats;
  const v = r.variable;
  const unit = unitText(deltaUnit(v.unit));
  const det = detectText(r);
  const opts = v.threshold_options.length > 1 ? v.threshold_options : null;

  return (
    <Card
      title="Test details"
      desc="p-value: the chance of a change this large by luck if there were no trend"
      footer={
        opts && (
          <div className="foot-seg">
            <span className="muted">Threshold ({v.condition})</span>
            <Seg
              label="Threshold"
              options={opts.map((o) => ({ id: String(o), label: withUnit(o, v.threshold_unit) }))}
              value={String(r.threshold)}
              onChange={(id) => onThreshold(Number(id))}
            />
          </div>
        )
      }
    >
      <dl className="vd">
        <dt>Slope method</dt>
        <dd>{st.method === "sen" ? "Sen (robust to outlier years)" : "OLS (least squares)"}</dd>
        <dt>Sen slope</dt>
        <dd className="num">
          {signed(st.sen.slope_per_decade)}
          {unit} / decade
        </dd>
        <dt>OLS slope</dt>
        <dd className="num">
          {signed(st.ols.slope_per_decade)}
          {unit} / decade
        </dd>
        <dt>Mann-Kendall</dt>
        <dd className="num">
          {pText(st.mk.p)} (tau {st.mk.tau.toFixed(2)})
        </dd>
        <dt>t-test</dt>
        <dd className="num">{pText(st.ols.p)}</dd>
        <dt>Autocorrelation-adjusted</dt>
        <dd className="num">{pText(st.ols.p_ar1)}</dd>
        <dt>Record length</dt>
        <dd className="num">{st.n} years</dd>
      </dl>

      {det && <p className="flag info">{det}</p>}
      {st.flags.includes("tests_disagree") && <p className="flag">The t-test and Mann-Kendall disagree. A few years with large values may be driving the slope.</p>}
      {st.flags.includes("one_year_drives_result") && (
        <p className="flag">
          Dropping the most extreme year ({st.leave_out.year}) changes the verdict to ‘{st.leave_out.verdict.label}’. One year drives the result.
        </p>
      )}
      {!st.flags.includes("one_year_drives_result") && st.verdict.status === "significant" && <p className="flag info">Dropping the most extreme year ({st.leave_out.year}) gives the same verdict.</p>}
      {st.flags.includes("autocorrelation_weakens") && <p className="flag">Adjusted for autocorrelation, the t-test gives {pText(st.ols.p_ar1)} (weaker significance).</p>}
      {r.overlay && (
        <p className="flag info">
          Correlation with {r.overlay.label}:{" "}
          {r.overlay.correlation
            ? `r = ${r.overlay.correlation.r.toFixed(2)} (${pText(r.overlay.correlation.p)}, ${r.overlay.correlation.n} years)`
            : `not calculated, only ${r.overlay.common_years} overlapping years`}
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
