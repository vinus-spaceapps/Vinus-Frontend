import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import VariableCard from "../components/VariableCard";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { wideScreen } from "../lib/format";
import { BASKET_LIMIT, useSelection } from "../lib/selection";
import type { CategoryId, ChatMsg, VariableChatResponse } from "../lib/types";

interface UiMsg extends ChatMsg {
  meta?: Pick<VariableChatResponse, "add" | "source">;
}

const SUGGESTIONS = ["봄마다 서리 때문에 걱정이야", "수확기에 산불 연기가 걱정돼", "적산온도가 뭐야?", "지금 품종이 계속 맞을까?"];

const WELCOME: UiMsg = {
  role: "assistant",
  content: "무엇이 걱정되세요? 말씀해 주시면 관련 변수를 골라 바구니에 담아 드릴게요. 변수 뜻을 물어보셔도 됩니다.",
};

export default function VariablePicker() {
  const nav = useNavigate();
  const { categories, variables, health } = useCatalog();
  const { sel, addVar, removeVar } = useSelection();
  const [tab, setTab] = useState<CategoryId | "all">("all");
  const [open, setOpen] = useState(wideScreen);
  const [msgs, setMsgs] = useState<UiMsg[]>([WELCOME]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const shown = tab === "all" ? variables : variables.filter((v) => v.category === tab);
  const catOf = (id: CategoryId) => categories.find((c) => c.id === id);

  const toggle = (id: string) => {
    if (sel.basket.includes(id)) return removeVar(id);
    if (!addVar(id)) setNotice(`바구니는 최대 ${BASKET_LIMIT}개까지 담을 수 있어요. 그래프 비교가 읽히는 수준이에요.`);
    else setNotice(null);
  };

  const send = async (text: string) => {
    const next: UiMsg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const history: ChatMsg[] = next.filter((m) => m !== WELCOME).map(({ role, content }) => ({ role, content }));
      const res = await api.variableChat(history, sel.basket);
      // 바구니 상태는 렌더 사이에 바뀌므로 앞에서부터 하나씩 담습니다.
      let room = BASKET_LIMIT - sel.basket.length;
      const added = res.add.filter((a) => {
        if (room <= 0) return false;
        room -= 1;
        addVar(a.id);
        return true;
      });
      setMsgs([...next, { role: "assistant", content: res.reply, meta: { add: added, source: res.source } }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: `답변을 가져오지 못했어요. ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container page">
      <div className={`with-panel ${open ? "open" : ""}`}>
        <section>
          <div className="page-title">
            <div>
              <h1>분석할 변수 고르기</h1>
              <p>카드를 누르면 바구니에 담겨요. 마우스를 올리면 쉬운 설명이 나옵니다. 최대 {BASKET_LIMIT}개.</p>
            </div>
          </div>

          <div className="seg tabs" role="group" aria-label="카테고리">
            <button aria-pressed={tab === "all"} onClick={() => setTab("all")}>
              전체
            </button>
            {categories.map((c) => (
              <button key={c.id} aria-pressed={tab === c.id} onClick={() => setTab(c.id)}>
                {c.name}
              </button>
            ))}
          </div>

          <div className="var-grid">
            {shown.map((v) => (
              <VariableCard key={v.id} v={v} category={catOf(v.category)} inBasket={sel.basket.includes(v.id)} onToggle={() => toggle(v.id)} />
            ))}
          </div>

          <div className="glass basket">
            <span className="lbl">
              분석 바구니 {sel.basket.length}/{BASKET_LIMIT}
            </span>
            <div className="chips">
              {sel.basket.length === 0 && <span className="muted small">아직 비어 있어요. 카드를 누르거나 AI에게 걱정을 말해 보세요.</span>}
              {sel.basket.map((id) => (
                <span className="chip tag" key={id}>
                  {variables.find((v) => v.id === id)?.name ?? id}
                  <button onClick={() => removeVar(id)} aria-label="바구니에서 빼기">
                    ×
                  </button>
                </span>
              ))}
            </div>
            {notice && <span className="warn-line">{notice}</span>}
            <span className="spacer" />
            <button className="btn btn-primary" disabled={sel.basket.length === 0} onClick={() => nav("/region")}>
              지역 설정으로
            </button>
          </div>
        </section>

        {open && (
          <ChatPanel
            title="변수 담기 AI"
            subtitle={health?.ai.enabled ? "걱정을 말하면 맞는 변수를 담아 드려요" : "AI 꺼짐, 키워드로 찾아 드려요"}
            onClose={() => setOpen(false)}
            onSend={send}
            busy={busy}
            placeholder="예: 봄마다 서리 때문에 걱정이야"
            scrollKey={msgs.length}
          >
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.content}
                {m.meta && m.meta.add.length > 0 && (
                  <div className="added">
                    {m.meta.add.map((a) => (
                      <span key={a.id} className="badge">
                        + {a.name}
                      </span>
                    ))}
                  </div>
                )}
                {m.meta && (
                  <div className="src">
                    <span className={`badge ${m.meta.source === "llm" ? "" : "warn"}`}>{m.meta.source === "llm" ? "Claude" : "규칙 기반"}</span>
                  </div>
                )}
              </div>
            ))}
            {msgs.length === 1 && (
              <div className="chat-suggest">
                {SUGGESTIONS.map((s) => (
                  <button key={s} className="chip" onClick={() => send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </ChatPanel>
        )}
      </div>
      {!open && (
        <button className="glass panel-toggle" onClick={() => setOpen(true)}>
          ✦ 변수 담기 AI
        </button>
      )}
    </main>
  );
}
