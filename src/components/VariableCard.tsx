import { withUnit } from "../lib/format";
import type { Category, Variable } from "../lib/types";
import Icon from "./Icon";

interface Props {
  v: Variable;
  category?: Category;
  inBasket: boolean;
  onToggle: () => void;
}

const AGG = { count: "Day count", sum: "Total", mean: "Mean", min: "Minimum", max: "Maximum" } as const;

// 핵심 지표 카드 (Starwave 에피소드 카드: 태그 + 오른쪽 메타 / 제목 / 설명 / 흰 버튼). 마우스·초점을 주면 지표 md 설명 팝오버.
export default function VariableCard({ v, category, inBasket, onToggle }: Props) {
  return (
    <button className={`vcard ${inBasket ? "in" : ""}`} onClick={onToggle} aria-pressed={inBasket}>
      <span className="vcard-meta">
        <span className="tag">{category?.name}</span>
        <span>{v.dataset}</span>
      </span>
      <span className="vcard-title">{v.name}</span>
      <span className="vcard-desc">{v.short}</span>
      <span className="vcard-foot">
        <span className={`btn sm ${inBasket ? "secondary" : "primary"}`} aria-hidden>
          <Icon name={inBasket ? "check" : "plus"} size={16} />
          {inBasket ? "Added" : "Add"}
        </span>
        <span className="muted">
          {AGG[v.aggregation] ?? v.aggregation}
          {!v.has_real_data && ", sample data"}
        </span>
      </span>
      <span className="popover" role="tooltip">
        <b>{v.name}</b>
        {v.sections.definition}
        {v.sections.why && (
          <>
            <span className="lbl">Why it matters</span>
            {v.sections.why}
          </>
        )}
        <dl>
          <dt>Unit</dt>
          <dd>{v.unit}</dd>
          <dt>Period</dt>
          <dd>{v.stage}</dd>
          <dt>Condition</dt>
          <dd>
            {v.condition}
            {v.threshold !== null ? ` (default ${withUnit(v.threshold, v.threshold_unit)})` : ""}
          </dd>
          <dt>Source</dt>
          <dd>{v.source}</dd>
          <dt>Resolution</dt>
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
        <span className={`sq ${inBasket ? "on" : ""}`} aria-hidden>
          <Icon name={inBasket ? "check" : "plus"} size={18} />
        </span>
      </button>
    </li>
  );
}
