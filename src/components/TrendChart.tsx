import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type DotProps } from "recharts";
import type { VariableResult } from "../lib/types";

interface Row {
  year: number;
  value?: number;
  head?: number;
  other?: number;
  user?: number;
}

interface Props {
  r: VariableResult;
}

// 연도별 점 + 추세선. 튼튼한 지표(robust)는 Sen 기울기가 굵은 선, OLS 는 옅은 선.
export default function TrendChart({ r }: Props) {
  const robust = r.stats.method === "sen";
  const head = robust ? r.trend.sen : r.trend.ols;
  const other = robust ? r.trend.ols : r.trend.sen;
  const lo = r.stats.leave_out.year;
  const unit = r.variable.unit;

  const rows = new Map<number, Row>();
  const row = (y: number) => rows.get(y) ?? rows.set(y, { year: y }).get(y)!;
  r.series.forEach((p) => (row(p.year).value = p.value));
  head.forEach((p) => (row(p.year).head = p.value));
  other.forEach((p) => (row(p.year).other = p.value));
  r.overlay?.points.forEach((p) => {
    if (p.year >= r.start && p.year <= r.end) row(p.year).user = p.value;
  });
  const data = [...rows.values()].sort((a, b) => a.year - b.year);

  const Dot = (props: DotProps & { payload?: Row }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.value == null) return null;
    const isLo = payload.year === lo;
    return <circle cx={cx} cy={cy} r={isLo ? 6 : 4} fill={isLo ? "#d69e2e" : "#7a1f3d"} stroke="#fff" strokeWidth={1.5} />;
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 10, right: r.overlay ? 8 : 16, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#eee6e1" vertical={false} />
          <XAxis dataKey="year" type="number" domain={[r.start, r.end]} tickCount={8} allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis yAxisId="l" tick={{ fontSize: 12 }} width={56} label={{ value: unit, angle: -90, position: "insideLeft", offset: 18, fontSize: 12, fill: "#6b6468" }} />
          {r.overlay && <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 12 }} width={48} stroke="#2b6cb0" />}
          <Tooltip
            formatter={(v: number, name: string) => [typeof v === "number" ? v.toFixed(2).replace(/\.00$/, "") : v, name]}
            labelFormatter={(y) => `${y}년`}
            contentStyle={{ borderRadius: 10, fontSize: 13 }}
          />
          <Line yAxisId="l" dataKey="value" name={`${r.variable.name} (${unit})`} stroke="#7a1f3d" strokeOpacity={0.25} strokeWidth={1.5} dot={<Dot />} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="other" name={robust ? "OLS 추세선" : "Sen 추세선"} stroke="#8a8f98" strokeDasharray="3 4" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
          <Line yAxisId="l" dataKey="head" name={robust ? "Sen 추세선" : "OLS 추세선"} stroke="#b8892b" strokeWidth={3} dot={false} connectNulls isAnimationActive={false} />
          {r.overlay && (
            <Line yAxisId="r" dataKey="user" name={r.overlay.label} stroke="#2b6cb0" strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span>
          <i style={{ background: "#7a1f3d", height: 8, width: 8, borderRadius: 4 }} />
          연도별 값
        </span>
        <span>
          <i style={{ background: "#b8892b" }} />
          {robust ? "Sen 추세선 (헤드라인)" : "OLS 추세선 (헤드라인)"}
        </span>
        <span>
          <i style={{ background: "#8a8f98" }} />
          {robust ? "OLS 추세선" : "Sen 추세선"}
        </span>
        <span>
          <i style={{ background: "#d69e2e", height: 8, width: 8, borderRadius: 4 }} />
          가장 튄 해 ({lo})
        </span>
        {r.overlay && (
          <span>
            <i style={{ background: "#2b6cb0" }} />
            {r.overlay.label} (오른쪽 축)
          </span>
        )}
      </div>
    </div>
  );
}
