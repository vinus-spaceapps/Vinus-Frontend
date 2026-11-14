import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ChatPanel from "../components/ChatPanel";
import { Seg } from "../components/DashCards";
import Icon from "../components/Icon";
import VariableCard, { VariableRow } from "../components/VariableCard";
import { api } from "../lib/api";
import { useCatalog } from "../lib/catalog";
import { wideScreen } from "../lib/format";
import { BASKET_LIMIT, useSelection } from "../lib/selection";
import type { ChatMsg, VariableChatResponse } from "../lib/types";

interface UiMsg extends ChatMsg {
  meta?: Pick<VariableChatResponse, "add" | "source">;
}

const SUGGESTIONS = ["Spring frost damage", "Fungal disease at harvest", "What are growing degree days?", "Tropical nights"];
const PAGE = 40;

const WELCOME: UiMsg = {
  role: "assistant",
  content: "Describe a climate concern and I’ll recommend related indicators. You can also ask what an indicator means.",
};

export default function VariablePicker() {
  const nav = useNavigate();
  const { categories, families, variables, health } = useCatalog();
  const { sel, addVar, removeVar } = useSelection();
  const [sp] = useSearchParams();
  const [fam, setFam] = useState(sp.get("f") ?? "core");
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(wideScreen);
  const [msgs, setMsgs] = useState<UiMsg[]>([WELCOME]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // 검색어가 있으면 묶음과 상관없이 전체에서, 없으면 고른 묶음 안에서
  const term = q.trim().toLowerCase();
  const pool = term
    ? variables.filter((v) => [v.name, v.short, v.id, ...v.keywords].some((s) => s.toLowerCase().includes(term)))
    : variables.filter((v) => v.family === fam);
  const shown = cat === "all" ? pool : pool.filter((v) => v.category === cat);
  const asCards = !term && fam === "core";
  const catOf = (id: string) => categories.find((c) => c.id === id);
  const famOf = (id: string) => families.find((f) => f.id === id)?.name ?? id;
  const famCount = (id: string) => variables.filter((v) => v.family === id).length;

  const toggle = (id: string) => {
    if (sel.basket.includes(id)) return removeVar(id);
    if (!addVar(id)) setNotice(`You can select up to ${BASKET_LIMIT}.`);
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
      setMsgs([...next, { role: "assistant", content: `Couldn’t get a response. ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main>
      <header className="page-hero">
        <div className="page-hero-art" aria-hidden>
          <span />
        </div>
        <div className="wrap">
          <p className="label">Step 1</p>
          <h1>Pick indicators</h1>
          <p className="lead">
            Choose up to {BASKET_LIMIT} of {variables.length} indicators. Hover over a core indicator card to see its definition and why it matters.
          </p>
        </div>
      </header>

      {/* Selected-indicator bar: sticks to the top like the Episode Listen bar */}
      <div className="sticky-bar">
        <div className="wrap sticky-in">
          <span className="lbl num">
            Selected {sel.basket.length}/{BASKET_LIMIT}
          </span>
          <div className="chips">
            {sel.basket.length === 0 && <span className="muted">None yet</span>}
            {sel.basket.map((id) => (
              <span className="tab-chip" key={id}>
                <span className="t">{variables.find((v) => v.id === id)?.name ?? id}</span>
                <button className="x" onClick={() => removeVar(id)} aria-label="Remove">
                  <Icon name="close" size={14} />
                </button>
              </span>
            ))}
          </div>
          {notice && <span className="warn-line">{notice}</span>}
          <span className="spacer" />
          <button className="btn secondary sm" aria-pressed={open} onClick={() => setOpen((o) => !o)}>
            <Icon name="comment" size={16} /> AI recommender
          </button>
          <button className="btn primary sm" disabled={sel.basket.length === 0} onClick={() => nav("/region")}>
            Next
          </button>
        </div>
      </div>

      <div className={`wrap with-panel ${open ? "open" : ""}`}>
        <section className="picker">
          <label className="input search">
            <Icon name="search" size={20} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or keyword (e.g. frost, tropical nights, ETCCDI)" aria-label="Search indicators" />
          </label>

          {!term && (
            <Seg
              label="Indicator family"
              options={families.map((f) => ({ id: f.id, label: `${f.name} ${famCount(f.id)}` }))}
              value={fam}
              onChange={(id) => {
                setFam(id);
                setCat("all");
                setLimit(PAGE);
              }}
            />
          )}
          <Seg
            label="Category"
            options={[{ id: "all", label: `All ${pool.length}` }, ...categories.map((c) => ({ id: c.id, label: `${c.name} ${pool.filter((v) => v.category === c.id).length}` })).filter((o) => !o.label.endsWith(" 0"))]}
            value={cat}
            onChange={(id) => {
              setCat(id);
              setLimit(PAGE);
            }}
          />

          {shown.length === 0 && <p className="empty">No matching indicators. Try a different word.</p>}
          {asCards ? (
            <div className="var-grid">
              {shown.map((v) => (
                <VariableCard key={v.id} v={v} category={catOf(v.category)} inBasket={sel.basket.includes(v.id)} onToggle={() => toggle(v.id)} />
              ))}
            </div>
          ) : (
            shown.length > 0 && (
              <>
                <ul className="vrows">
                  {shown.slice(0, limit).map((v) => (
                    <VariableRow
                      key={v.id}
                      v={v}
                      sub={`${famOf(v.family)} · ${catOf(v.category)?.name ?? ""}`}
                      inBasket={sel.basket.includes(v.id)}
                      onToggle={() => toggle(v.id)}
                    />
                  ))}
                </ul>
                {shown.length > limit && (
                  <button className="btn secondary more" onClick={() => setLimit((l) => l + PAGE * 2)}>
                    Show more ({shown.length - limit} left)
                  </button>
                )}
              </>
            )
          )}
        </section>

        {open && (
          <ChatPanel
            title="Indicator recommender AI"
            subtitle={health?.ai.enabled ? "Suggests indicators for your question" : "AI off, keyword search"}
            onClose={() => setOpen(false)}
            onSend={send}
            busy={busy}
            placeholder="e.g. Spring frost damage"
            scrollKey={msgs.length}
          >
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.content}
                {m.meta && m.meta.add.length > 0 && (
                  <div className="added">
                    {m.meta.add.map((a) => (
                      <span key={a.id} className="pill-sm on">
                        + {a.name}
                      </span>
                    ))}
                  </div>
                )}
                {m.meta && (
                  <div className="src">
                    <span className={`pill-sm ${m.meta.source === "llm" ? "" : "warn"}`}>{m.meta.source === "llm" ? "AI" : "Rule-based"}</span>
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
    </main>
  );
}
