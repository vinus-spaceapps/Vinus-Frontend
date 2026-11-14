import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "./Icon";

interface Props {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  onSend: (text: string) => void;
  busy?: boolean;
  placeholder?: string;
  footer?: ReactNode;
  scrollKey?: unknown;
}

// 오른쪽 AI 패널 공통 틀. 내용(메시지)은 각 페이지가 그립니다.
export default function ChatPanel({ title, subtitle, onClose, children, onSend, busy, placeholder, footer, scrollKey }: Props) {
  const [text, setText] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scrollKey, busy]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText("");
  };

  return (
    <aside className="card chat" aria-label={title}>
      <div className="chat-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <div className="sub">{subtitle}</div>}
        </div>
        <button className="ic" onClick={onClose} aria-label="Close panel" title="Close">
          <Icon name="close" size={20} />
        </button>
      </div>
      <div className="chat-body" ref={bodyRef}>
        {children}
        {busy && (
          <div className="msg assistant">
            <span className="spinner" />
          </div>
        )}
      </div>
      {footer}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input className="input pill" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder ?? "Type a message"} disabled={busy} />
        <button className="btn primary" type="submit" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}
