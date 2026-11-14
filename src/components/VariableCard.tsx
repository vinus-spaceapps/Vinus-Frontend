import type { Category, Variable } from "../lib/types";

interface Props {
  v: Variable;
  category?: Category;
  inBasket: boolean;
  onToggle: () => void;
}

const AGG = { count: "날수", sum: "합계", mean: "평균" } as const;

// 변수 카드. 마우스를 올리거나 키보드로 초점을 주면 쉬운 소개 팝오버가 뜹니다(지표 md 내용 그대로).
export default function VariableCard({ v, category, inBasket, onToggle }: Props) {
  return (
    <button className={`var-card ${inBasket ? "in" : ""}`} onClick={onToggle} aria-pressed={inBasket}>
      <span className="check" aria-hidden>
        ✓
      </span>
      <span className="cat">{category?.name}</span>
      <h3>{v.name}</h3>
      <span className="muted small">{v.short}</span>
      <span className="meta">
        <span>{v.dataset}</span>
        <span>{v.stage}</span>
        <span>{AGG[v.aggregation]}</span>
      </span>
      <span className="popover" role="tooltip">
        <h4>{v.name}</h4>
        {v.sections.definition}
        <span className="lbl">왜 중요한가</span>
        {v.sections.why}
        <dl>
          <dt>단위</dt>
          <dd>{v.unit}</dd>
          <dt>조건</dt>
          <dd>
            {v.condition}
            {v.threshold !== null ? ` (기본 ${v.threshold}${v.threshold_unit})` : ""}
          </dd>
          <dt>출처</dt>
          <dd>{v.source}</dd>
          <dt>기간</dt>
          <dd>
            {v.start_year}~{v.end_year}
          </dd>
          <dt>해상도</dt>
          <dd>{v.resolution}</dd>
        </dl>
      </span>
    </button>
  );
}
