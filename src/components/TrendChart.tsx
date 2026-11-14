import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type DotProps, type TooltipProps } from "recharts";
import type { VariableResult } from "../lib/types";
import { useTokens } from "../theme";

interface Row {
  year: number;
  value?: number;
  sen?: number;
  ols?: number;
  user?: number;
}

interface Props {
  r: VariableResult;
}

const fmt = (v: number) => v.toFixed(2).replace(/\.?0+$/, "");

function Tip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      <b>{label}년</b>
      {payload
        .filter((p) => typeof p.value === "number")
        .map((p) => (
          <span key={String(p.dataKey)}>
            {p.name} <b className="num">{fmt(p.value as number)}</b>
          </span>
        ))}
    </div>
  );
}

// 연도별 점 + 추세선. 데이터는 전경색(다크=흰), Sen 은 실선, OLS 는 옅은 점선. 헤드라인 방법이 더 굵음.
// 색이 들어가는 건 사용자가 겹친 자기 기록(데이터)뿐.
export default function TrendChart({ r }: Props) {
  const t = useTokens();
  const robust = r.stats.method === "sen";
  const lo = r.stats.leave_out.year;
  const unit = r.variable.unit;

  const rows = new Map<number, Row>();
  const row = (y: number) => rows.get(y) ?? rows.set(y, { year: y }).get(y)!;
  r.series.forEach((p) => (row(p.year).value = p.value));
  r.trend.sen.forEach((p) => (row(p.year).sen = p.value));
  r.trend.ols.forEach((p) => (row(p.year).ols = p.value));
  r.overlay?.points.forEach((p) => {
    if (p.year >= r.start && p.year <= r.end) row(p.year).user = p.value;
  });
  const data = [...rows.values()].sort((a, b) => a.year - b.year);

  // 가장 튄 해만 링, 나머지는 작은 채운 점
  const Dot = (props: DotProps & { payload?: Row }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.value == null) return null;
    return payload.year === lo ? (
      <circle cx={cx} cy={cy} r={5.5} fill={t.bg} stroke={t.fg} strokeWidth={2} />
    ) : (
      <circle cx={cx} cy={cy} r={3} fill={t.fg} />
    );
  };

  const tick = { fontSize: 11, fill: t.muted };

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 10, right: r.overlay ? 4 : 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={t.line} vertical={false} />
          <XAxis dataKey="year" type="number" domain={[r.start, r.end]} tickCount={6} allowDecimals={false} tick={tick} stroke={t.line} tickLine={false} />
          <YAxis
            yAxisId="l"
            tick={tick}
            width={56}
            axisLine={false}
            tickLine={false}
            label={unit ? { value: unit, angle: -90, position: "insideLeft", offset: 22, fontSize: 11, fill: t.muted } : undefined}
          />
          {r.overlay && <YAxis yAxisId="r" orientation="right" tick={{ ...tick, fill: t.overlay }} width={44} axisLine={false} tickLine={false} />}
          <Tooltip content={<Tip />} cursor={{ stroke: t.line }} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="value" name={r.variable.name} stroke={t.fg} strokeOpacity={0.3} strokeWidth={1} dot={<Dot />} activeDot={{ r: 5, fill: t.fg, stroke: t.bg, strokeWidth: 2 }} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="ols" name="OLS 추세" stroke={t.faint} strokeDasharray="4 4" strokeWidth={robust ? 1.5 : 2.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          <Line yAxisId="l" dataKey="sen" name="Sen 추세" stroke={t.fg} strokeWidth={robust ? 2.5 : 1.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          {r.overlay && (
            <Line yAxisId="r" dataKey="user" name={r.overlay.label} stroke={t.overlay} strokeWidth={2} dot={{ r: 2.5, fill: t.overlay, stroke: "none" }} connectNulls isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="chart-legend">
        <span>
          <i className="lg-dot" />
          연도별 값
        </span>
        <span>
          <i className="lg-line" />
          Sen 추세{robust ? " (헤드라인)" : ""}
        </span>
        <span>
          <i className="lg-dash" />
          OLS 추세{robust ? "" : " (헤드라인)"}
        </span>
        <span>
          <i className="lg-ring" />
          최대 이상치 ({lo})
        </span>
        {r.overlay && (
          <span>
            <i className="lg-line" style={{ background: t.overlay }} />
            {r.overlay.label} (오른쪽 축)
          </span>
        )}
      </div>
    </div>
  );
}
