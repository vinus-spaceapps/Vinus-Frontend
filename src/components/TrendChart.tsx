import { CartesianGrid, ComposedChart, Customized, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";
import type { VariableResult } from "../lib/types";
import { useTokens } from "../theme";
import { Key } from "./DashCards";

interface Row {
  year: number;
  value?: number;
  sen?: number;
  ols?: number;
  user?: number;
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

function Tip({ active, payload, unit, userLabel }: TooltipProps<number, string> & { unit: string; userLabel?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  if (row.value === undefined) return null;
  const diff = row.sen !== undefined ? row.value - row.sen : null;
  return (
    <div className="chart-tip">
      <small>{row.year}년</small>
      <b className="num">
        {fmt(row.value)}
        {unit}
        {diff !== null && <em className={diff >= 0 ? "up" : "down"}>{`${diff >= 0 ? "▴" : "▾"} ${fmt(Math.abs(diff))}`}</em>}
      </b>
      <small>추세선 대비</small>
      {row.user !== undefined && (
        <small>
          {userLabel} {fmt(row.user)}
        </small>
      )}
    </div>
  );
}

// 그래프 영역 테두리 (Figma 그래프의 Outline 사각형)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlotFrame(props: any & { stroke: string }) {
  const o = props.offset;
  if (!o) return null;
  return <rect x={o.left} y={o.top} width={o.width} height={o.height} fill="none" stroke={props.stroke} />;
}

// Figma Scatter Plot Graph: 위에 Key, 테두리 있는 칸에 가로·세로 격자, 축 이름("연도", "값").
// 해마다 값 = 파랑 점, Sen 추세 = 진한 선, OLS = 회색 점선, 가장 튄 해 = 링.
export default function TrendChart({ r }: { r: VariableResult }) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Point = (p: any) => {
    const { cx, cy, payload } = p;
    if (cx == null || cy == null) return <g />;
    return payload.year === lo ? (
      <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={t.blue} strokeWidth={2.5} />
    ) : (
      <ellipse cx={cx} cy={cy} rx={5} ry={4} fill={t.blue} />
    );
  };

  const tick = { fontSize: 12, fill: t.muted };
  const axisLabel = { fontSize: 12, fill: t.text };

  return (
    <div className="trend">
      <Key
        items={[
          { label: "해마다 값", color: t.blue },
          { label: robust ? "Sen 추세 (기준)" : "Sen 추세", color: t.ink, kind: "dash" },
          { label: robust ? "OLS 추세" : "OLS 추세 (기준)", color: t.none, kind: "dash" },
          { label: `최대 이상치 ${lo}`, color: t.blue, kind: "ring" },
          ...(r.overlay ? [{ label: `${r.overlay.label} (오른쪽 축)`, color: t.orange }] : []),
        ]}
      />
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 6, right: r.overlay ? 0 : 6, bottom: 22, left: 6 }}>
          <CartesianGrid stroke={t.line2} />
          <Customized component={(p: object) => <PlotFrame {...p} stroke={t.line2} />} />
          <XAxis dataKey="year" type="number" domain={[r.start, r.end]} tickCount={7} allowDecimals={false} tick={tick} axisLine={false} tickLine={false} label={{ value: "연도", position: "insideBottom", offset: -16, ...axisLabel }} />
          <YAxis yAxisId="l" tick={tick} width={48} axisLine={false} tickLine={false} label={{ value: unit ? `값 (${unit})` : "값", angle: -90, position: "insideLeft", offset: 2, ...axisLabel, style: { textAnchor: "middle" } }} />
          {r.overlay && <YAxis yAxisId="r" orientation="right" tick={{ ...tick, fill: t.orange }} width={40} axisLine={false} tickLine={false} />}
          <Tooltip content={<Tip unit={unit} userLabel={r.overlay?.label} />} cursor={{ stroke: t.muted, strokeDasharray: "3 3", strokeWidth: 1 }} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="ols" type="linear" stroke={t.none} strokeDasharray="5 4" strokeWidth={robust ? 1.5 : 2} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          <Line yAxisId="l" dataKey="sen" type="linear" stroke={t.ink} strokeWidth={robust ? 2 : 1.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          <Scatter yAxisId="l" dataKey="value" shape={Point} isAnimationActive={false} />
          {r.overlay && <Line yAxisId="r" dataKey="user" type="monotone" stroke={t.orange} strokeWidth={2} dot={{ r: 2.5, fill: t.orange, stroke: "none" }} connectNulls isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
