"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { mockTraceEvents } from "@/lib/mock-data";
import {
  User,
  Brain,
  Route,
  Search,
  Shield,
  Wrench,
  Cpu,
  Filter,
  Send,
  ChevronDown,
  ChevronRight,
  AlertTriangle
} from "lucide-react";

type TraceEvent = ReturnType<typeof mockTraceEvents>[number];

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: typeof User; color: string; bg: string }
> = {
  user_input:      { label: "用户输入",     icon: User,    color: "#3b82f6", bg: "#eff6ff" },
  intent_classify: { label: "意图识别",     icon: Brain,   color: "#8b5cf6", bg: "#f5f3ff" },
  model_route:     { label: "模型路由",     icon: Route,   color: "#6366f1", bg: "#eef2ff" },
  rag_retrieve:    { label: "RAG 检索",     icon: Search,  color: "#0891b2", bg: "#ecfeff" },
  risk_check:      { label: "风控检测",     icon: Shield,  color: "#dc2626", bg: "#fef2f2" },
  tool_call:       { label: "工具调用",     icon: Wrench,  color: "#ea580c", bg: "#fff7ed" },
  model_generate:  { label: "模型生成",     icon: Cpu,     color: "#059669", bg: "#ecfdf5" },
  post_process:    { label: "后处理",       icon: Filter,  color: "#7c3aed", bg: "#faf5ff" },
  response_sent:   { label: "响应发送",     icon: Send,    color: "#16a34a", bg: "#f0fdf4" }
};

export default function TracePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const events = mockTraceEvents(sessionId);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "22px 28px" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700 }}>
          Trace 回放
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>
          Session: <code style={{ fontSize: 12 }}>{sessionId}</code>
          {" · "}
          {events.length} 个事件
          {" · "}
          总耗时 {totalDuration(events)}ms
        </div>
      </div>

      {/* Timeline */}
      <div style={{ position: "relative" }}>
        {/* Vertical line */}
        <div
          style={{
            position: "absolute",
            left: 19,
            top: 0,
            bottom: 0,
            width: 2,
            background: "var(--border)"
          }}
        />

        {events.map((ev, i) => (
          <TraceEventCard key={ev.id} event={ev} index={i} />
        ))}
      </div>
    </div>
  );
}

function TraceEventCard({ event, index }: { event: TraceEvent; index: number }) {
  const [expanded, setExpanded] = useState(
    event.eventType === "risk_check" || event.eventType === "rag_retrieve"
  );

  const config = EVENT_CONFIG[event.eventType] ?? {
    label: event.eventType,
    icon: Wrench,
    color: "var(--text-3)",
    bg: "var(--bg)"
  };
  const Icon = config.icon;
  const isError = "isError" in event && event.isError;

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        marginBottom: 4,
        position: "relative"
      }}
    >
      {/* Dot */}
      <div
        style={{
          width: 40,
          display: "flex",
          justifyContent: "center",
          paddingTop: 16,
          position: "relative",
          zIndex: 1,
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: isError ? "#fee2e2" : config.bg,
            border: `2px solid ${isError ? "#dc2626" : config.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {isError ? (
            <AlertTriangle size={11} style={{ color: "#dc2626" }} />
          ) : (
            <Icon size={11} style={{ color: config.color }} />
          )}
        </div>
      </div>

      {/* Card */}
      <div
        className="card"
        style={{
          flex: 1,
          padding: 0,
          marginBottom: 10,
          borderColor: isError ? "#fca5a5" : undefined,
          background: isError ? "#fef2f2" : "#fff",
          overflow: "hidden"
        }}
      >
        {/* Header */}
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            cursor: "pointer",
            userSelect: "none"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              className={`pill ${isError ? "pill-danger" : ""}`}
              style={{
                fontSize: 11,
                fontWeight: 600,
                background: isError ? undefined : config.bg,
                color: isError ? undefined : config.color
              }}
            >
              {config.label}
            </span>
            <span style={{ fontSize: 11.5, color: "var(--text-3)" }}>
              {new Date(event.ts).toLocaleTimeString("zh-CN", {
                hour12: false,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
              })}
            </span>
            {event.durationMs !== null && (
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--text-3)" }}
              >
                {event.durationMs}ms
              </span>
            )}
          </div>
          {expanded ? (
            <ChevronDown size={14} style={{ color: "var(--text-3)" }} />
          ) : (
            <ChevronRight size={14} style={{ color: "var(--text-3)" }} />
          )}
        </div>

        {/* Payload */}
        {expanded && (
          <div
            style={{
              padding: "0 14px 12px",
              borderTop: "1px solid var(--border)"
            }}
          >
            <PayloadView eventType={event.eventType} payload={event.payload} />
          </div>
        )}
      </div>
    </div>
  );
}

function PayloadView({
  eventType,
  payload
}: {
  eventType: string;
  payload: Record<string, unknown>;
}) {
  if (eventType === "user_input") {
    return (
      <div style={{ padding: "10px 0", fontSize: 13, color: "var(--text-1)" }}>
        &ldquo;{String(payload.text)}&rdquo;
      </div>
    );
  }

  if (eventType === "rag_retrieve") {
    const hits = payload.hits as Array<{ docId: string; tier: number; sim: number }>;
    return (
      <div style={{ paddingTop: 10 }}>
        <KV label="策略" value={String(payload.strategy)} />
        <KV label="Query 改写" value={String(payload.queryRewrite)} />
        <KV label="Top-K" value={String(payload.topK)} />
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 4 }}>
            命中文档
          </div>
          {hits.map((h) => (
            <div
              key={h.docId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                padding: "3px 0"
              }}
            >
              <span className="pill pill-muted" style={{ fontSize: 10 }}>
                T{h.tier}
              </span>
              <code style={{ fontSize: 11 }}>{h.docId}</code>
              <span style={{ marginLeft: "auto", fontWeight: 600 }}>
                {h.sim.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (eventType === "risk_check") {
    const hit = payload.hit as Array<{ signal: string; evidence: string; severity: string }>;
    return (
      <div style={{ paddingTop: 10 }}>
        <KV label="检查信号" value={(payload.signalsChecked as string[]).join(", ")} />
        <KV label="动作" value={String(payload.action)} />
        {hit && hit.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>
              命中风控
            </div>
            {hit.map((h, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  fontSize: 12,
                  marginBottom: 4
                }}
              >
                <strong>{h.signal}</strong> · {h.evidence} ·{" "}
                <span className="pill pill-danger" style={{ fontSize: 10 }}>
                  {h.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Generic key-value fallback
  return (
    <div style={{ paddingTop: 10 }}>
      {Object.entries(payload).map(([k, v]) => (
        <KV key={k} label={k} value={typeof v === "object" ? JSON.stringify(v) : String(v)} />
      ))}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 12,
        padding: "3px 0",
        gap: 8
      }}
    >
      <span style={{ color: "var(--text-3)", minWidth: 80, flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          color: "var(--text-1)",
          fontFamily: "var(--font-mono, monospace)",
          wordBreak: "break-all"
        }}
      >
        {value}
      </span>
    </div>
  );
}

function totalDuration(events: TraceEvent[]): number {
  if (events.length < 2) return 0;
  const first = Date.parse(events[0].ts);
  const last = Date.parse(events[events.length - 1].ts);
  return last - first;
}
