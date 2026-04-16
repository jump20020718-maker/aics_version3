"use client";

export function ThinkingIndicator({
  thinking,
  reasoning,
  expanded,
  onToggle,
  onInterrupt,
  hasOutput
}: {
  thinking: Array<{ stage: string; detail?: string }>;
  reasoning: Array<{ icon: string; label: string; detail?: string }>;
  expanded: boolean;
  onToggle: () => void;
  onInterrupt: () => void;
  hasOutput: boolean;
}) {
  const stageLabel: Record<string, string> = {
    intent: "意图识别",
    context: "上下文关联",
    retrieve: "检索策略"
  };
  return (
    <div
      style={{
        alignSelf: "flex-end",
        maxWidth: 680,
        display: "flex",
        flexDirection: "column",
        gap: 6
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 14px",
          borderRadius: 999,
          background: "#fff",
          border: "1px solid var(--primary-100)",
          color: "var(--text-2)",
          fontSize: 12.5,
          alignSelf: "flex-end"
        }}
      >
        <span className="thinking-dot" />
        <span>{hasOutput ? "AI 正在生成…" : "AI 正在思考…"}</span>
        <span style={{ width: 1, height: 12, background: "var(--border)" }} />
        <button
          onClick={onToggle}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--primary)",
            fontSize: 12,
            cursor: "pointer",
            padding: 0
          }}
        >
          {expanded ? "收起推理" : "展开推理"}
        </button>
        <button
          onClick={onInterrupt}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--danger)",
            fontSize: 12,
            cursor: "pointer",
            padding: 0
          }}
        >
          打断
        </button>
      </div>

      {expanded && (thinking.length > 0 || reasoning.length > 0) && (
        <div
          className="reasoning-trace"
          style={{
            background: "#fff",
            borderRadius: 10,
            padding: "10px 14px",
            border: "1px solid var(--border)",
            maxWidth: 680,
            alignSelf: "flex-end"
          }}
        >
          {/* Thinking stages */}
          {thinking.map((t, i) => (
            <div key={`t${i}`} className="reasoning-step" style={{ opacity: 0.65 }}>
              <span className="icon">🧠</span>
              <div>
                <strong style={{ color: "var(--text-2)" }}>
                  {stageLabel[t.stage] ?? t.stage}
                </strong>
                {t.detail && (
                  <span style={{ color: "var(--text-3)" }}> — {t.detail}</span>
                )}
              </div>
            </div>
          ))}
          {/* Reasoning steps */}
          {reasoning.map((r, i) => (
            <div key={`r${i}`} className="reasoning-step">
              <span className="icon">{r.icon}</span>
              <div>
                <strong style={{ color: "var(--text-1)" }}>{r.label}</strong>
                {r.detail && <span style={{ color: "var(--text-3)" }}> — {r.detail}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
