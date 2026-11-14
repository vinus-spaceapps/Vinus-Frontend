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
  current?: string; // indicator shown in the main view: the AI follows it when it changes
}

const EXAMPLES = ["Impact of 2020", "What’s a confidence interval?", "Does this apply to my vineyard?", "Compare with other regions"];

const CELLS: { key: keyof InsightCard; title: string }[] = [
  { key: "summary", title: "Summary" },
  { key: "numbers", title: "Numbers" },
  { key: "confidence", title: "Confidence" },
  { key: "meaning", title: "For growers" },
];

function SourceBadge({ source, unverified }: { source: string; unverified: string[] }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <span className={`pill-sm ${source === "llm" ? "" : "warn"}`}>{source === "llm" ? "AI" : "Rule-based"}</span>
      {unverified.length > 0 && <span className="warn-line">Contains numbers not in the engine results: {unverified.join(", ")} (please verify)</span>}
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
      title="Insight AI"
      subtitle={aiEnabled ? "Explains the statistical results" : "AI off, rule-based summary"}
      onClose={onClose}
      onSend={ask}
      busy={busy}
      placeholder="Ask a question"
      scrollKey={items.length}
      footer={
        (vars.length > 1 || items.length > 0) && (
        <div className="chat-tools">
          {vars.length > 1 && (
            <select className="chip-select" value={activeVar} onChange={(e) => setVarId(e.target.value)} aria-label="Indicator for insight">
              {vars.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          {items.length > 0 && (
            <button className="btn primary sm" onClick={() => requestCard(decision)} disabled={busy} style={{ marginLeft: "auto" }}>
              ✦ Show insight
            </button>
          )}
        </div>
        )
      }
    >
      {items.length === 0 && !busy && (
        <div className="ai-empty">
          <p className="muted small">
            Explains the current chart and verdict
            <br />
            Uses only numbers from the statistics engine
          </p>
          <button className="btn primary" onClick={() => requestCard(decision)}>
            ✦ Show insight
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
        if (it.kind === "error") return <div key={i} className="msg assistant">Couldn’t get a response. {it.text}</div>;
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
              {it.sources.length > 0 && <div className="muted small" style={{ marginTop: 6 }}>Sources: {it.sources.join(", ")}</div>}
              <div className="src">
                <SourceBadge source={it.source} unverified={it.unverified} />
              </div>
            </div>
          );
        return (
          <div key={i} className="insight">
            <span className="muted small">Insight: {it.varName}</span>
            {CELLS.map((c) => (
              <div key={c.key} className={`insight-cell ${c.key === "summary" ? "summary" : ""}`}>
                <h4>{c.title}</h4>
                {it.card[c.key] as string}
              </div>
            ))}
            {it.card.next_steps.length > 0 && (
              <div className="insight-cell">
                <h4>Check next</h4>
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
              <h4>Sources</h4>
              <span className="small">{it.card.sources.join(", ")}</span>
            </div>
            <SourceBadge source={it.source} unverified={it.unverified} />
          </div>
        );
      })}
    </ChatPanel>
  );
}
