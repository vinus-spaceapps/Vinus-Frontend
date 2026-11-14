import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { AnalyzeQuery, Decision, InsightCard, NextStepChange } from "../lib/types";
import ChatPanel from "./ChatPanel";

type Item =
  | { kind: "user"; text: string }
  | { kind: "ask"; question: string; options: Decision[]; answered: boolean }
  | { kind: "card"; card: InsightCard; varName: string; source: string; unverified: string[] }
  | { kind: "answer"; text: string; sources: string[]; source: string; unverified: string[] }
  | { kind: "error"; text: string };

interface Props {
  query: AnalyzeQuery;
  vars: { id: string; name: string }[];
  aiEnabled: boolean;
  onApply: (change: NextStepChange, varId: string) => void;
  onClose: () => void;
  current?: string; // 본문에서 보고 있는 변수: 바뀌면 AI 도 그 변수 기준으로
}

const EXAMPLES = ["2020년 영향", "신뢰구간 뜻", "우리 밭 적용 여부", "다른 산지와 비교"];

const CELLS: { key: keyof InsightCard; title: string }[] = [
  { key: "summary", title: "한 줄 요약" },
  { key: "numbers", title: "수치" },
  { key: "confidence", title: "신뢰도" },
  { key: "meaning", title: "생산자 관점" },
];

function SourceBadge({ source, unverified }: { source: string; unverified: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span className={`pill-sm ${source === "llm" ? "" : "warn"}`}>{source === "llm" ? "AI" : "규칙 기반"}</span>
      {unverified.length > 0 && <span className="warn-line">엔진 결과에 없는 숫자 포함: {unverified.join(", ")} (확인 필요)</span>}
    </div>
  );
}

// ④ 인사이트 AI: 엔진 결과를 생산자 말로 풀고, 다음에 볼 것을 버튼으로 제안.
export default function InsightPanel({ query, vars, aiEnabled, onApply, onClose, current }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState<string | null>(null);
  const [varId, setVarId] = useState(current ?? vars[0]?.id ?? "");
  useEffect(() => {
    if (current) setVarId(current);
  }, [current]);
  const activeVar = vars.find((v) => v.id === varId) ? varId : vars[0]?.id;
  const varName = vars.find((v) => v.id === activeVar)?.name ?? "";

  const push = (it: Item) => setItems((xs) => [...xs, it]);

  const requestCard = async (dec: string | null) => {
    if (!activeVar) return;
    setBusy(true);
    try {
      const res = await api.insight(query, activeVar, dec);
      if (res.type === "need_context") push({ kind: "ask", question: res.question, options: res.options, answered: false });
      else if (res.type === "card") push({ kind: "card", card: res.card, varName, source: res.source, unverified: res.unverified_numbers });
    } catch (e) {
      push({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const choose = (idx: number, d: Decision) => {
    setDecision(d.id);
    setItems((xs) => xs.map((x, i) => (i === idx && x.kind === "ask" ? { ...x, answered: true } : x)));
    push({ kind: "user", text: d.label });
    void requestCard(d.id);
  };

  const ask = async (text: string) => {
    if (!activeVar) return;
    push({ kind: "user", text });
    setBusy(true);
    try {
      const res = await api.insight(query, activeVar, decision, text);
      if (res.type === "answer") push({ kind: "answer", text: res.answer, sources: res.sources, source: res.source, unverified: res.unverified_numbers });
    } catch (e) {
      push({ kind: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ChatPanel
      title="인사이트 AI"
      subtitle={aiEnabled ? "통계 결과 해설" : "AI 꺼짐, 규칙 기반 요약"}
      onClose={onClose}
      onSend={ask}
      busy={busy}
      placeholder="질문 입력"
      scrollKey={items.length}
      footer={
        (vars.length > 1 || items.length > 0) && (
        <div className="chat-tools">
          {vars.length > 1 && (
            <select className="chip-select" value={activeVar} onChange={(e) => setVarId(e.target.value)} aria-label="인사이트 대상 변수">
              {vars.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          {items.length > 0 && (
            <button className="btn pill sm" onClick={() => requestCard(decision)} disabled={busy} style={{ marginLeft: "auto" }}>
              ✦ 인사이트 보기
            </button>
          )}
        </div>
        )
      }
    >
      {items.length === 0 && !busy && (
        <div className="ai-empty">
          <p className="muted small">
            현재 그래프와 판정 결과 해설
            <br />
            통계 엔진이 계산한 수치만 사용
          </p>
          <button className="btn pill" onClick={() => requestCard(decision)}>
            ✦ 인사이트 보기
          </button>
          <div className="chat-suggest">
            {EXAMPLES.map((q) => (
              <button key={q} className="chip" onClick={() => ask(q)}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
      {items.map((it, i) => {
        if (it.kind === "user") return <div key={i} className="msg user">{it.text}</div>;
        if (it.kind === "error") return <div key={i} className="msg assistant">응답을 받을 수 없습니다. {it.text}</div>;
        if (it.kind === "ask")
          return (
            <div key={i} className="msg assistant">
              {it.question}
              {!it.answered && (
                <div className="decision-grid" style={{ marginTop: 10 }}>
                  {it.options.map((o) => (
                    <button key={o.id} className="chip" onClick={() => choose(i, o)}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        if (it.kind === "answer")
          return (
            <div key={i} className="msg assistant">
              {it.text}
              {it.sources.length > 0 && <div className="muted small" style={{ marginTop: 6 }}>근거: {it.sources.join(", ")}</div>}
              <div className="src">
                <SourceBadge source={it.source} unverified={it.unverified} />
              </div>
            </div>
          );
        return (
          <div key={i} className="insight">
            <span className="muted small">{it.varName} 인사이트</span>
            {CELLS.map((c) => (
              <div key={c.key} className={`insight-cell ${c.key === "summary" ? "summary" : ""}`}>
                <h4>{c.title}</h4>
                {it.card[c.key] as string}
              </div>
            ))}
            {it.card.next_steps.length > 0 && (
              <div className="insight-cell">
                <h4>추가 확인</h4>
                <div className="next-steps">
                  {it.card.next_steps.map((s) => (
                    <button key={s.label} onClick={() => onApply(s.change, activeVar!)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="insight-cell">
              <h4>근거</h4>
              <span className="small">{it.card.sources.join(", ")}</span>
            </div>
            <SourceBadge source={it.source} unverified={it.unverified} />
          </div>
        );
      })}
    </ChatPanel>
  );
}
