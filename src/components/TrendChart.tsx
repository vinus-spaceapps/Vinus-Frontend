import { Area, Bar, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNum, lineAt, signed } from "../lib/format";
import type { VariableResult } from "../lib/types";
import { useTokens } from "../theme";

interface Row {
  year: number;
  value: number;
  sen?: number;
  ols?: number;
  overlay?: number;
}

// Figma 툴팁 (검정 바탕 + 흰 글자)
function Tip({ active, payload, unit }: { active?: boolean; payload?: { payload: Row }[]; unit: string }) {
  const p = payload?.[0]?.payload;
  if (!active || !p) return null;
  const diff = p.sen !== undefined ? p.value - p.sen : null;
  return (
    <div className="tip">
      <small>{p.year}년</small>
      <b>
        {fmtNum(p.value, 2)}
        {unit}
      </b>
      {diff !== null && (
        <small>
          추세보다 {signed(diff)}
          {unit}
        </small>
      )}
      {p.overlay !== undefined && <small>내 기록 {fmtNum(p.overlay, 2)}</small>}
    </div>
  );
}

// 날수(count)만 0 기준 막대가 뜻이 있음. 합계(적산온도 1,600~2,100 등)·평균·최댓값은 선으로 봐야 변화가 보임
export const asBars = (r: VariableResult) => r.variable.aggregation === "count" && Math.min(...r.series.map((p) => p.value)) >= 0;

// 연도별 값: 날수는 $890.93 카드의 둥근 막대, 그 밖(기온·합계 등)은 Monthly Average Rainfall 의 선 + 옅은 면.
// 가장 큰 해는 진한 막대 + 점선 기준선, Sen 추세는 진한 선, OLS 는 회색 점선.
export default function TrendChart({ r }: { r: VariableResult }) {
  const t = useTokens();
  const unit = r.variable.unit;
  const ov = new Map((r.overlay?.points ?? []).map((p) => [p.year, p.value]));
  const data: Row[] = r.series.map((p) => ({ year: p.year, value: p.value, sen: lineAt(r.trend.sen, p.year), ols: lineAt(r.trend.ols, p.year), overlay: ov.get(p.year) }));
  const vals = data.map((d) => d.value);
  const max = Math.max(...vals);
  const peak = data.find((d) => d.value === max)?.year;
  const bars = asBars(r);
  const axis = { tickLine: false, axisLine: false, tick: { fill: t.axis, fontSize: 12 } } as const;

  return (
    <div className="trend" role="img" aria-label={`${r.variable.name} 연도별 값과 추세선, ${r.start}–${r.end}`}>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 22, right: r.overlay ? 8 : 40, left: 0, bottom: 0 }} barCategoryGap="18%">
          <defs>
            <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={t.w4} stopOpacity={0.35} />
              <stop offset="1" stopColor={t.w4} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="year" {...axis} interval="preserveStartEnd" minTickGap={14} />
          <YAxis {...axis} width={48} domain={bars ? [0, "auto"] : ["auto", "auto"]} tickFormatter={(v: number) => fmtNum(v)} />
          {r.overlay && <YAxis yAxisId="ov" orientation="right" {...axis} width={40} />}
          <ReferenceLine y={max} stroke={t.w3} strokeDasharray="5 5" strokeWidth={2} label={{ value: `MAX ${peak}`, position: "insideTopRight", fill: "#000", fontSize: 12, fontWeight: 700, dy: -16 }} />
          {bars ? (
            <Bar dataKey="value" radius={[8, 8, 8, 8]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.year} fill={d.year === peak ? t.w3 : t.barOff} />
              ))}
            </Bar>
          ) : (
            <>
              <Area dataKey="value" stroke="none" fill="url(#trend-area)" isAnimationActive={false} />
              <Line dataKey="value" stroke={t.w3} strokeWidth={2} dot={{ r: 3, fill: t.w3, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            </>
          )}
          <Line dataKey="ols" stroke={t.muted} strokeWidth={1.5} strokeDasharray="5 4" dot={false} activeDot={false} isAnimationActive={false} />
          <Line dataKey="sen" stroke={t.ink} strokeWidth={2.5} dot={false} activeDot={false} isAnimationActive={false} />
          {r.overlay && <Line yAxisId="ov" dataKey="overlay" stroke={t.blue} strokeWidth={2} dot={{ r: 3, fill: t.blue, strokeWidth: 0 }} connectNulls isAnimationActive={false} />}
          {/* 툴팁은 포인터에 바로 붙게 (기본 400ms 미끄러짐 끔), 어두운 바탕용 옅은 흰 커서 */}
          <Tooltip content={<Tip unit={unit} />} cursor={{ fill: "rgb(255 255 255 / 0.05)" }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
