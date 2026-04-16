"use client";

import Link from "next/link";
import { useState } from "react";
import type { MessageItem } from "@/lib/mock-data";
import { formatClock } from "@/lib/format";

export function MessageBubble({ message }: { message: MessageItem }) {
  const [showReasoning, setShowReasoning] = useState(false);

  if (message.role === "system") {
    return (
      <div style={{ alignSelf: "center", maxWidth: 500 }}>
        <div className="bubble bubble-system">{message.content}</div>
      </div>
    );
  }

  const isUser = message.role === "user";
  const isAi = message.role === "assistant";
  const isAgent = message.role === "agent";

  return (
    <div
      style={{
        alignSelf: isUser ? "flex-start" : "flex-end",
        maxWidth: 680,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: isUser ? "flex-start" : "flex-end"
      }}
    >
      {message.plan && (
        <div
          style={{
            alignSelf: "flex-end",
            padding: 10,
            borderRadius: 10,
            background: "var(--primary-50)",
            border: "1px dashed var(--primary)",
            fontSize: 12,
            marginBottom: 4,
            maxWidth: 680
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--primary-600)", marginBottom: 4 }}>
            分步回答计划
          </div>
          <ol style={{ margin: 0, paddingLeft: 16 }}>
            {message.plan.map((p, i) => (
              <li key={i}>
                {p.status === "done" ? "✓" : "☐"} {p.text}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div
        className={`bubble ${
          isUser ? "bubble-user" : isAgent ? "bubble-agent" : "bubble-ai"
        }`}
      >
        {message.content.split("\n").map((line, i) => (
          <div key={i}>{line || <>&nbsp;</>}</div>
        ))}
      </div>

      {isAi && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {message.citations && message.citations.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {message.citations.map((c, i) => (
                <span key={i} className="citation-chip" title={c.title}>
                  <span className={`tier-${c.tier}`}>● tier-{c.tier}</span>
                  {c.title.slice(0, 20)}
                </span>
              ))}
            </div>
          )}
          <span style={{ color: "var(--text-3)", fontSize: 11 }}>
            {message.modelId && <>📎 {message.modelId}</>}
            {message.confidence != null && <> · conf {message.confidence.toFixed(2)}</>}
            {message.latencyMs != null && <> · {(message.latencyMs / 1000).toFixed(1)}s</>}
          </span>
          {message.reasoning && (
            <button
              onClick={() => setShowReasoning((v) => !v)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--primary)",
                fontSize: 11,
                cursor: "pointer",
                padding: 0
              }}
            >
              {showReasoning ? "收起推理" : "展开推理"}
            </button>
          )}
          <Link
            href={`/trace/${message.id}?session=${(message as any).sessionId ?? ""}`}
            style={{ color: "var(--text-3)", fontSize: 11 }}
          >
            查看处理流程 ↗
          </Link>
        </div>
      )}

      {showReasoning && message.reasoning && (
        <div
          className="reasoning-trace"
          style={{ alignSelf: "flex-end", maxWidth: 680, background: "#fafafb", padding: "8px 14px", borderRadius: 8 }}
        >
          {message.reasoning.map((r, i) => (
            <div key={i} className="reasoning-step">
              <span className="icon">{r.icon}</span>
              <div>
                <strong style={{ color: "var(--text-1)" }}>{r.label}</strong>
                {r.detail && <span style={{ color: "var(--text-3)" }}> — {r.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <span style={{ color: "var(--text-3)", fontSize: 10.5, marginTop: 2 }}>
        {formatClock(message.createdAt)}
        {message.agentName && ` · @${message.agentName}`}
      </span>
    </div>
  );
}
