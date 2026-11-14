// 기후 줄무늬: 해마다 한 줄, 값이 클수록 밝은 장미색 (어두울수록 작은 해). 장식이 아니라 실제 값.
export default function Stripes({ values, className = "" }: { values: number[]; className?: string }) {
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  return (
    <div className={`stripes ${className}`} aria-hidden>
      {values.map((v, i) => (
        <i key={i} style={{ opacity: 0.08 + 0.92 * ((v - lo) / span) ** 1.3 }} />
      ))}
    </div>
  );
}

// 작은 막대 그래프 (카드용): 가장 큰 해만 진하게
export function MiniBars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values) || 1;
  return (
    <div className="mini-bars" role="img" aria-label={label}>
      {values.map((v, i) => (
        <i key={i} style={{ height: `${Math.max(3, (v / max) * 100)}%` }} {...(v === max ? { "data-peak": "" } : {})} />
      ))}
    </div>
  );
}
