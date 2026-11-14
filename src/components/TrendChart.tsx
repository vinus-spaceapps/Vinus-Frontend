import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Customized, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type DotProps, type TooltipProps } from "recharts";
import type { VariableResult } from "../lib/types";
import { useTokens } from "../theme";

interface Row {
  year: number;
  value?: number;
  sen?: number;
  ols?: number;
  user?: number;
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

// 흰 말풍선: 연도 / 값 / 추세선 대비 차이
function Tip({ active, payload, label, unit, userLabel }: TooltipProps<number, string> & { unit: string; userLabel?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  if (row.value === undefined) return null;
  const diff = row.sen !== undefined ? row.value - row.sen : null;
  return (
    <div className="chart-tip">
      <small>{label}년</small>
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
  return <rect x={o.left} y={o.top} width={o.width} height={o.height} rx={4} fill="none" stroke={props.stroke} />;
}

// Figma Line/Area Graph: 위에 범례, 테두리 있는 그래프 칸, 세로·가로 격자, 축 제목.
// 연도별 값 = 보라 선 + 아래로 옅어지는 면, Sen = 파랑, OLS = 회색 점선, 가장 튄 해 = 링.
export default function TrendChart({ r }: { r: VariableResult }) {
  const t = useTokens();
  const gid = useId().replace(/:/g, "");
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

  const Dot = (props: DotProps & { payload?: Row }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.year !== lo) return null;
    return <circle cx={cx} cy={cy} r={5} fill={t.card} stroke={t.purple} strokeWidth={2.5} />;
  };

  const tick = { fontSize: 12, fill: t.muted };

  return (
    <div className="trend">
      <ul className="key">
        <li>
          <i style={{ background: t.purple }} />
          연도별 값
        </li>
        <li>
          <i style={{ background: t.blue }} />
          Sen 추세{robust ? " (기준)" : ""}
        </li>
        <li>
          <i className="dash" style={{ borderColor: t.none }} />
          OLS 추세{robust ? "" : " (기준)"}
        </li>
        <li>
          <i className="ring" style={{ borderColor: t.purple }} />
          최대 이상치 {lo}
        </li>
        {r.overlay && (
          <li>
            <i style={{ background: t.orange }} />
            {r.overlay.label} (오른쪽 축)
          </li>
        )}
      </ul>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 8, right: r.overlay ? 4 : 8, bottom: 18, left: 4 }}>
          <defs>
            <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={t.purple} stopOpacity={0.32} />
              <stop offset="1" stopColor={t.purple} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.line2} />
          <Customized component={(p: object) => <PlotFrame {...p} stroke={t.line2} />} />
          <XAxis
            dataKey="year"
            type="number"
            domain={[r.start, r.end]}
            tickCount={7}
            allowDecimals={false}
            tick={tick}
            axisLine={false}
            tickLine={false}
            label={{ value: "연도", position: "insideBottom", offset: -14, fontSize: 12, fill: t.text }}
          />
          <YAxis
            yAxisId="l"
            tick={tick}
            width={56}
            axisLine={false}
            tickLine={false}
            label={{ value: unit ? `값 (${unit})` : "값", angle: -90, position: "insideLeft", offset: 6, fontSize: 12, fill: t.text, style: { textAnchor: "middle" } }}
          />
          {r.overlay && <YAxis yAxisId="r" orientation="right" tick={{ ...tick, fill: t.orange }} width={40} axisLine={false} tickLine={false} />}
          <Tooltip content={<Tip unit={unit} userLabel={r.overlay?.label} />} cursor={{ stroke: t.muted, strokeDasharray: "3 3", strokeWidth: 1 }} isAnimationActive={false} />
          <Area yAxisId="l" dataKey="value" name={r.variable.name} type="monotone" stroke={t.purple} strokeWidth={2.5} fill={`url(#${gid})`} dot={<Dot />} activeDot={{ r: 5, fill: t.card, stroke: t.purple, strokeWidth: 2.5 }} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="ols" name="OLS 추세" type="linear" stroke={t.none} strokeDasharray="5 4" strokeWidth={robust ? 1.5 : 2.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          <Line yAxisId="l" dataKey="sen" name="Sen 추세" type="linear" stroke={t.blue} strokeWidth={robust ? 2.5 : 1.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          {r.overlay && <Line yAxisId="r" dataKey="user" name={r.overlay.label} type="monotone" stroke={t.orange} strokeWidth={2} dot={{ r: 2.5, fill: t.orange, stroke: "none" }} connectNulls isAnimationActive={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
