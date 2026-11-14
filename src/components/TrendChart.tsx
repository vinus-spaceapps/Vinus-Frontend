import { useId } from "react";
import { CartesianGrid, ComposedChart, Customized, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type DotProps, type TooltipProps } from "recharts";
import type { VariableResult } from "../lib/types";
import { useTokens } from "../theme";
import { scaleColor } from "../tone";

interface Row {
  year: number;
  value?: number;
  sen?: number;
  ols?: number;
  user?: number;
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

// 어두운 말풍선: 값 + 추세선 대비 차이 + 연도
function Tip({ active, payload, label, unit }: TooltipProps<number, string> & { unit: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  if (row.value === undefined) return null;
  const diff = row.sen !== undefined ? row.value - row.sen : null;
  return (
    <div className="chart-tip">
      <b className="num">
        {fmt(row.value)}
        {unit}
      </b>
      {diff !== null && <em className="num">{`${diff >= 0 ? "+" : ""}${fmt(diff)}`}</em>}
      <small>{label}년, 추세선 대비</small>
      {row.user !== undefined && <small>내 기록 {fmt(row.user)}</small>}
    </div>
  );
}

interface PillItem {
  value: number;
  label: string;
  fill: string;
  text: string;
}

// 선 끝에 이름표. 서로 겹치지 않게 세로로 밀어냄
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EndPills(props: any & { items: PillItem[] }) {
  const y = props.yAxisMap?.l?.scale;
  const off = props.offset;
  if (!y || !off) return null;
  const placed = (props.items as PillItem[])
    .map((it) => ({ ...it, y: y(it.value) as number }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < placed.length; i++) placed[i].y = Math.max(placed[i].y, placed[i - 1].y + 26);
  const x = off.left + off.width + 10;
  return (
    <g>
      {placed.map((p) => {
        const w = p.label.length * 11 + 20;
        return (
          <g key={p.label} transform={`translate(${x}, ${p.y - 11})`}>
            <rect width={w} height={22} rx={11} fill={p.fill} />
            <text x={w / 2} y={15} textAnchor="middle" fontSize={11} fontWeight={600} fill={p.text}>
              {p.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

// 연도별 값은 값 크기에 따라 초록→주황→빨강 그라데이션 선, Sen 은 회색 실선, OLS 는 회색 점선. 가장 튄 해만 링.
export default function TrendChart({ r }: { r: VariableResult }) {
  const t = useTokens();
  const gid = useId().replace(/:/g, "");
  const robust = r.stats.method === "sen";
  const lo = r.stats.leave_out.year;
  const unit = r.variable.unit;
  const hi = r.variable.higher_is;

  const rows = new Map<number, Row>();
  const row = (y: number) => rows.get(y) ?? rows.set(y, { year: y }).get(y)!;
  r.series.forEach((p) => (row(p.year).value = p.value));
  r.trend.sen.forEach((p) => (row(p.year).sen = p.value));
  r.trend.ols.forEach((p) => (row(p.year).ols = p.value));
  r.overlay?.points.forEach((p) => {
    if (p.year >= r.start && p.year <= r.end) row(p.year).user = p.value;
  });
  const data = [...rows.values()].sort((a, b) => a.year - b.year);

  const vs = r.series.map((p) => p.value);
  const vmin = Math.min(...vs), vspan = Math.max(...vs) - vmin || 1;
  const first = r.series[0]?.year ?? r.start, last = r.series[r.series.length - 1]?.year ?? r.end;
  const lastVal = r.series[r.series.length - 1]?.value ?? 0;
  const lastColor = scaleColor((lastVal - vmin) / vspan, hi);
  const endOf = (pts: { year: number; value: number }[]) => pts[pts.length - 1]?.value;

  const Dot = (props: DotProps & { payload?: Row }) => {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null || payload?.year !== lo) return null;
    return <circle cx={cx} cy={cy} r={5} fill={t.card} stroke={t.fg} strokeWidth={2} />;
  };

  const pills: PillItem[] = [
    { value: lastVal, label: "연도별 값", fill: lastColor, text: "#fff" },
    ...(endOf(r.trend.sen) !== undefined ? [{ value: endOf(r.trend.sen)!, label: robust ? "Sen 추세" : "Sen", fill: t.chip, text: t.muted }] : []),
    ...(endOf(r.trend.ols) !== undefined ? [{ value: endOf(r.trend.ols)!, label: robust ? "OLS" : "OLS 추세", fill: t.chip, text: t.muted }] : []),
  ];

  const tick = { fontSize: 11, fill: t.muted };

  return (
    <div className="trend">
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data} margin={{ top: 12, right: 96, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={gid} x1="0" x2="1" y1="0" y2="0">
              {r.series.map((p) => (
                <stop key={p.year} offset={last === first ? 0 : (p.year - first) / (last - first)} stopColor={scaleColor((p.value - vmin) / vspan, hi)} />
              ))}
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.line} vertical={false} />
          <XAxis dataKey="year" type="number" domain={[r.start, r.end]} tickCount={6} allowDecimals={false} tick={tick} axisLine={false} tickLine={false} />
          <YAxis yAxisId="l" tick={tick} width={52} axisLine={false} tickLine={false} />
          {r.overlay && <YAxis yAxisId="r" orientation="right" tick={{ ...tick, fill: t.cool }} width={40} axisLine={false} tickLine={false} />}
          <Tooltip content={<Tip unit={unit} />} cursor={{ stroke: t.fg, strokeDasharray: "2 4", strokeWidth: 1 }} isAnimationActive={false} />
          <Line yAxisId="l" dataKey="ols" name="OLS 추세" type="linear" stroke={t.none} strokeDasharray="4 4" strokeWidth={robust ? 1.5 : 2.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          <Line yAxisId="l" dataKey="sen" name="Sen 추세" type="linear" stroke={t.none} strokeWidth={robust ? 2.5 : 1.5} dot={false} activeDot={false} connectNulls isAnimationActive={false} />
          <Line
            yAxisId="l"
            dataKey="value"
            name={r.variable.name}
            type="monotone"
            stroke={`url(#${gid})`}
            strokeWidth={2.5}
            dot={<Dot />}
            activeDot={{ r: 6, fill: t.card, stroke: t.fg, strokeWidth: 2 }}
            isAnimationActive={false}
          />
          {r.overlay && <Line yAxisId="r" dataKey="user" name={r.overlay.label} type="monotone" stroke={t.cool} strokeWidth={2} dot={{ r: 2.5, fill: t.cool, stroke: "none" }} connectNulls isAnimationActive={false} />}
          <Customized component={(p: object) => <EndPills {...p} items={pills} />} />
        </ComposedChart>
      </ResponsiveContainer>
      <p className="card-note">
        링: 가장 튄 해 ({lo}). {robust ? "Sen 추세가 헤드라인" : "OLS 추세가 헤드라인"}
        {r.overlay ? `. 파란 선: ${r.overlay.label} (오른쪽 축)` : ""}
      </p>
    </div>
  );
}
