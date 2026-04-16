"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SessionItem, MessageItem, Citation } from "@/lib/mock-data";
import { formatClock } from "@/lib/format";
import { MessageBubble } from "./MessageBubble";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { Composer } from "./Composer";

export function ChatArea({
  session,
  onUpdateSession
}: {
  session: SessionItem;
  onUpdateSession: (
    sessionId: string,
    updater: (s: SessionItem) => SessionItem
  ) => void;
}) {
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [thinking, setThinking] = useState<Array<{ stage: string; detail?: string }>>([]);
  const [reasoning, setReasoning] = useState<
    Array<{ icon: string; label: string; detail?: string }>
  >([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [plan, setPlan] = useState<Array<{ text: string; status: "pending" | "doing" | "done" }>>([]);
  const [reasoningExpanded, setReasoningExpanded] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [session.id, session.messages.length, streamText]);

  const handleSend = async (text: string) => {
    // 1) append user message locally
    const userMsg: MessageItem = {
      id: `m_u_${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString()
    };
    onUpdateSession(session.id, (s) => ({
      ...s,
      messages: [...s.messages, userMsg],
      preview: text.slice(0, 40)
    }));

    // 2) start SSE
    setStreaming(true);
    setStreamText("");
    setThinking([]);
    setReasoning([]);
    setCitations([]);
    setPlan([]);
    const ac = new AbortController();
    abortRef.current = ac;
    let collectedText = "";
    let latency = 0;
    let modelId = "";

    try {
      const res = await fetch(`/api/inbox/sessions/${session.id}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, sessionScene: session.currentScene }),
        signal: ac.signal
      });

      if (!res.ok || !res.body) throw new Error("stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const lines = part.split("\n");
          let event = "message";
          let data = "";
          for (const l of lines) {
            if (l.startsWith("event:")) event = l.slice(6).trim();
            else if (l.startsWith("data:")) data += l.slice(5).trim();
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (event === "plan") setPlan(payload.steps);
            else if (event === "plan_update") setPlan(payload.steps);
            else if (event === "thinking") {
              setThinking((t) => [...t, payload]);
            } else if (event === "reasoning") {
              setReasoning((r) => [...r, payload]);
            } else if (event === "token") {
              collectedText += payload.delta;
              setStreamText(collectedText);
            } else if (event === "citation") {
              setCitations((c) => [...c, payload]);
            } else if (event === "done") {
              latency = payload.latencyMs;
              modelId = payload.model;
            }
          } catch (e) {
            // ignore parse errors
          }
        }
      }

      // commit final assistant message
      const assistantMsg: MessageItem = {
        id: `m_a_${Date.now()}`,
        role: "assistant",
        content: collectedText,
        createdAt: new Date().toISOString(),
        modelId,
        latencyMs: latency,
        confidence: 0.85,
        citations,
        reasoning
      };
      onUpdateSession(session.id, (s) => ({
        ...s,
        messages: [...s.messages, assistantMsg]
      }));
    } catch (e: any) {
      if (e?.name === "AbortError") {
        const interrupted: MessageItem = {
          id: `m_i_${Date.now()}`,
          role: "system",
          content: "⏹ 已打断。请输入新问题。",
          createdAt: new Date().toISOString(),
          isInterrupted: true
        };
        onUpdateSession(session.id, (s) => ({
          ...s,
          messages: [...s.messages, interrupted]
        }));
      } else {
        const errMsg: MessageItem = {
          id: `m_e_${Date.now()}`,
          role: "system",
          content: `❌ 生成失败：${e?.message ?? "unknown"}`,
          createdAt: new Date().toISOString()
        };
        onUpdateSession(session.id, (s) => ({
          ...s,
          messages: [...s.messages, errMsg]
        }));
      }
    } finally {
      setStreaming(false);
      setStreamText("");
      setThinking([]);
      setReasoning([]);
      setCitations([]);
      setPlan([]);
      abortRef.current = null;
    }
  };

  const handleInterrupt = () => {
    abortRef.current?.abort();
    // 通知服务端确认中断（fire-and-forget）
    fetch(`/api/inbox/sessions/${session.id}/interrupt`, { method: "POST" }).catch(() => {});
  };

  return (
    <section
      style={{
        background: "#fff",
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        borderRight: "1px solid var(--border)"
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "12px 22px",
          borderBottom: "1px solid var(--border-soft)",
          display: "flex",
          alignItems: "center",
          gap: 14
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: session.avatarColor,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 600,
            fontSize: 13
          }}
        >
          {session.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>
            {session.customerName}
            <span
              className={`pill ${
                session.customerLevel === "VIP" ? "pill-warning" : "pill-muted"
              }`}
              style={{ marginLeft: 8 }}
            >
              {session.customerLevel}
            </span>
          </h3>
          <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 2 }}>
            {session.orderId && <span className="mono">{session.orderId}</span>}
            {session.skuBrand && <span> · {session.skuBrand}</span>}
            {session.shipmentStatus && (
              <span
                style={{
                  marginLeft: 6,
                  color:
                    session.shipmentStatus === "delivered"
                      ? "var(--success)"
                      : session.shipmentStatus === "exception"
                      ? "var(--danger)"
                      : "var(--warning)"
                }}
              >
                ● {session.shipmentStatus}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="pill pill-primary">
            {session.handoffLevel ? `L${session.handoffLevel} 处理中` : "AI 处理中"}
          </span>
          <button className="btn">转接</button>
          <button className="btn btn-primary">接管</button>
        </div>
      </header>

      {/* Chat body */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "22px 22px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          background: "var(--bg)"
        }}
      >
        {session.messages.length === 0 && !streaming && (
          <div
            style={{
              margin: "auto",
              color: "var(--text-3)",
              textAlign: "center",
              padding: 40
            }}
          >
            <div style={{ fontSize: 14, marginBottom: 6 }}>暂无对话</div>
            <div style={{ fontSize: 12 }}>在下方 Composer 发送一条消息开始会话</div>
          </div>
        )}

        {session.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {streaming && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {plan.length > 0 && (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: 680,
                  padding: 12,
                  borderRadius: 10,
                  background: "var(--primary-50)",
                  border: "1px dashed var(--primary)",
                  color: "var(--text-1)"
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-600)", marginBottom: 6 }}>
                  我理解您一共问了 {plan.length} 件事，我会逐条回答：
                </div>
                <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5 }}>
                  {plan.map((p, i) => (
                    <li key={i} style={{ color: p.status === "done" ? "var(--success)" : "var(--text-2)" }}>
                      {p.status === "done" ? "✓" : p.status === "doing" ? "◐" : "☐"} {p.text}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <ThinkingIndicator
              thinking={thinking}
              reasoning={reasoning}
              expanded={reasoningExpanded}
              onToggle={() => setReasoningExpanded((v) => !v)}
              onInterrupt={handleInterrupt}
              hasOutput={streamText.length > 0}
            />

            {streamText && (
              <div style={{ alignSelf: "flex-end", maxWidth: 680 }}>
                <div className="bubble bubble-ai">
                  {streamText}
                  <span
                    className="thinking-dot"
                    style={{ marginLeft: 6, verticalAlign: "middle", background: "#fff" }}
                  />
                </div>
                {citations.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      marginTop: 6,
                      flexWrap: "wrap",
                      justifyContent: "flex-end"
                    }}
                  >
                    {citations.map((c, i) => (
                      <span key={i} className="citation-chip">
                        <span className={`tier-${c.tier}`}>● tier-{c.tier}</span>
                        {c.docId.slice(0, 26)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer */}
      <Composer disabled={streaming} onSend={handleSend} />
    </section>
  );
}
