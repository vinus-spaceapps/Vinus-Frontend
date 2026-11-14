import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const SUGGESTIONS = ["봄 서리 피해", "수확기 곰팡이병", "적산온도란?", "열대야"];
const PAGE = 40;

const WELCOME: UiMsg = {
  role: "assistant",
  content: "걱정되는 기후 문제를 입력하면 관련 변수를 추천합니다. 변수 뜻도 물어볼 수 있습니다.",
};

export default function VariablePicker() {
  const nav = useNavigate();
  const { categories, families, variables, health } = useCatalog();
  const { sel, addVar, removeVar } = useSelection();
  const [fam, setFam] = useState("core");
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
    if (!addVar(id)) setNotice(`최대 ${BASKET_LIMIT}개까지 선택할 수 있습니다.`);
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
      setMsgs([...next, { role: "assistant", content: `응답을 받을 수 없습니다. ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <div className={`with-panel ${open ? "open" : ""}`}>
        <section className="picker">
          <header className="page-title">
            <h1>변수 고르기</h1>
            <p>
              지표 {variables.length}개 중 최대 {BASKET_LIMIT}개. 핵심 지표 카드에 마우스를 올리면 설명이 뜹니다.
            </p>
          </header>

          {/* Forms: 회색 알약 입력 + 검색 아이콘 */}
          <label className="input pill lg search">
            <Icon name="search" size={22} />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·키워드로 찾기 (예: 서리, 열대야, ETCCDI)" aria-label="지표 검색" />
          </label>

          {!term && (
            <Seg
              label="지표 묶음"
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
            label="카테고리"
            options={[{ id: "all", label: `전체 ${pool.length}` }, ...categories.map((c) => ({ id: c.id, label: `${c.name} ${pool.filter((v) => v.category === c.id).length}` })).filter((o) => !o.label.endsWith(" 0"))]}
            value={cat}
            onChange={(id) => {
              setCat(id);
              setLimit(PAGE);
            }}
          />

          {shown.length === 0 && <p className="empty">찾는 지표가 없습니다.</p>}
          {asCards ? (
            <div className="var-grid">
              {shown.map((v) => (
                <VariableCard key={v.id} v={v} category={catOf(v.category)} inBasket={sel.basket.includes(v.id)} onToggle={() => toggle(v.id)} />
              ))}
            </div>
          ) : (
            shown.length > 0 && (
              <section className="card">
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
                  <footer className="card-foot">
                    <button className="foot-btn" onClick={() => setLimit((l) => l + PAGE * 2)}>
                      더 보기 ({shown.length - limit}개 남음)
                    </button>
                  </footer>
                )}
              </section>
            )
          )}

          <div className="card basket">
            <span className="lbl">
              선택 {sel.basket.length}/{BASKET_LIMIT}
            </span>
            <div className="seg">
              {sel.basket.length === 0 && <span className="muted">아직 없음</span>}
              {sel.basket.map((id) => (
                <span className="tab-chip" key={id}>
                  <span className="t">{variables.find((v) => v.id === id)?.name ?? id}</span>
                  <button className="x" onClick={() => removeVar(id)} aria-label="빼기">
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
            {notice && <span className="warn-line">{notice}</span>}
            <span className="spacer" />
            <button className="btn pill" disabled={sel.basket.length === 0} onClick={() => nav("/region")}>
              다음
            </button>
          </div>
        </section>

        {open && (
          <ChatPanel
            title="변수 추천 AI"
            subtitle={health?.ai.enabled ? "질문에 맞는 변수 추천" : "AI 꺼짐, 키워드 검색"}
            onClose={() => setOpen(false)}
            onSend={send}
            busy={busy}
            placeholder="예: 봄 서리 피해"
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
                    <span className={`pill-sm ${m.meta.source === "llm" ? "" : "warn"}`}>{m.meta.source === "llm" ? "AI" : "규칙 기반"}</span>
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
        <button className="btn pill panel-toggle" onClick={() => setOpen(true)}>
          <Icon name="comment" size={18} /> 변수 추천 AI
        </button>
      )}
    </main>
  );
}
