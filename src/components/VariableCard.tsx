import type { Category, Variable } from "../lib/types";
import Icon from "./Icon";

interface Props {
  v: Variable;
  category?: Category;
  inBasket: boolean;
  onToggle: () => void;
}

const AGG = { count: "날수", sum: "합계", mean: "평균", min: "최솟값", max: "최댓값" } as const;

// 핵심 지표 카드 (Figma card: 머리 25 + 둥근 아이콘 40 / 설명 / 알약 칩). 마우스·초점을 주면 지표 md 설명 팝오버.
export default function VariableCard({ v, category, inBasket, onToggle }: Props) {
  return (
    <button className={`card vcard ${inBasket ? "in" : ""}`} onClick={onToggle} aria-pressed={inBasket}>
      <span className="card-head">
        <span className="card-titles">
          <span className="card-meta">{category?.name}</span>
          <span className="card-title">{v.name}</span>
        </span>
        <span className="ic" aria-hidden>
          <Icon name={inBasket ? "check" : "plus"} size={22} />
        </span>
      </span>
      <span className="card-body">
        <span className="card-desc">{v.short}</span>
        <span className="seg static">
          <span>{v.dataset}</span>
          <span>{AGG[v.aggregation] ?? v.aggregation}</span>
          {!v.has_real_data && <span className="warn">예시 데이터</span>}
        </span>
      </span>
      <span className="popover" role="tooltip">
        <b>{v.name}</b>
        {v.sections.definition}
        {v.sections.why && (
          <>
            <span className="lbl">의미</span>
            {v.sections.why}
          </>
        )}
        <dl>
          <dt>단위</dt>
          <dd>{v.unit}</dd>
          <dt>시기</dt>
          <dd>{v.stage}</dd>
          <dt>조건</dt>
          <dd>
            {v.condition}
            {v.threshold !== null ? ` (기본 ${v.threshold}${v.threshold_unit})` : ""}
          </dd>
          <dt>출처</dt>
          <dd>{v.source}</dd>
          <dt>해상도</dt>
          <dd>{v.resolution}</dd>
        </dl>
      </span>
    </button>
  );
}

// 자동 생성 지표(수백 개)용 한 줄: 이름·설명 / 묶음·시기 / 담기 아이콘
export function VariableRow({ v, sub, inBasket, onToggle }: { v: Variable; sub: string; inBasket: boolean; onToggle: () => void }) {
  return (
    <li>
      <button className={`vrow ${inBasket ? "in" : ""}`} onClick={onToggle} aria-pressed={inBasket} title={v.sections.definition ?? v.short}>
        <span className="vrow-text">
          <b>{v.name}</b>
          <span>{v.short}</span>
        </span>
        <span className="vrow-meta">{sub}</span>
        <span className="ic sm" aria-hidden>
          <Icon name={inBasket ? "check" : "plus"} size={20} />
        </span>
      </button>
    </li>
  );
}
