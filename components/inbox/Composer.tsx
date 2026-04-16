"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Paperclip, Sparkles } from "lucide-react";

type Tab = "reply" | "note" | "transfer";

export function Composer({
  disabled,
  onSend
}: {
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("reply");
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const send = useCallback(() => {
    const v = text.trim();
    if (!v || disabled) return;
    onSend(v);
    setText("");
    if (taRef.current) taRef.current.style.height = "auto";
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "reply", label: "回复" },
    { key: "note", label: "内部备注" },
    { key: "transfer", label: "转接" }
  ];

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        background: "#fff",
        padding: "0 0 0"
      }}
    >
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--border-soft)",
          padding: "0 18px"
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "9px 16px",
              fontSize: 12.5,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? "var(--primary)" : "var(--text-3)",
              background: "none",
              border: "none",
              borderBottom:
                tab === t.key ? "2px solid var(--primary)" : "2px solid transparent",
              cursor: "pointer",
              transition: "all 150ms"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ padding: "12px 18px 8px" }}>
        <textarea
          ref={taRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            tab === "reply"
              ? '输入回复... 输入 "/" 插入宏命令，"@" 呼叫 AI Copilot'
              : tab === "note"
              ? "输入内部备注（仅客服团队可见）..."
              : "选择转接目标..."
          }
          rows={1}
          style={{
            width: "100%",
            resize: "none",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 13.5,
            lineHeight: 1.5,
            fontFamily: "inherit",
            color: "var(--text-1)",
            outline: "none",
            transition: "border-color 150ms, box-shadow 150ms",
            background: disabled ? "var(--bg)" : "#fff",
            opacity: disabled ? 0.6 : 1
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--primary)";
            e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }}
        />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px 10px"
        }}
      >
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className="btn"
            style={{ padding: "5px 8px", border: "none", color: "var(--text-3)" }}
            title="附件"
          >
            <Paperclip size={15} />
          </button>
          <button
            className="btn"
            style={{
              padding: "5px 8px",
              border: "none",
              color: "var(--text-3)",
              fontSize: 12
            }}
          >
            / 宏命令
          </button>
          <button
            className="btn"
            style={{
              padding: "5px 8px",
              border: "none",
              color: "var(--primary)",
              fontSize: 12,
              gap: 4
            }}
          >
            <Sparkles size={13} />
            AI 改写
          </button>
        </div>

        <button
          className="btn btn-primary"
          disabled={!text.trim() || disabled}
          onClick={send}
          style={{
            padding: "7px 16px",
            gap: 6,
            opacity: !text.trim() || disabled ? 0.5 : 1,
            cursor: !text.trim() || disabled ? "not-allowed" : "pointer"
          }}
        >
          <Send size={14} />
          发送
        </button>
      </div>
    </div>
  );
}
