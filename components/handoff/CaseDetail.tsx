"use client";

import type { HandoffCaseItem } from "@/lib/mock-data";
import { formatCny, formatTime } from "@/lib/format";
import {
  MessageSquare,
  Phone,
  ArrowUpRight,
  Ban,
  CheckCircle2
} from "lucide-react";

export function CaseDetail({ caseItem }: { caseItem: HandoffCaseItem }) {
  const c = caseItem;

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
      {/* Breadcrumb + Header */}
      <header
        style={{
          padding: "14px 22px",
          borderBottom: "1px solid var(--border-soft)"
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "var(--text-3)",
            marginBottom: 6
          }}
        >
          Handoff Queue / L{c.level} /{" "}
          <span className="mono">{c.orderId}</span>
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>
          {c.title}
        </h2>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12.5,
            color: "var(--text-2)",
            flexWrap: "wrap"
          }}
        >
          <span>{c.customerName}</span>
          <span className="mono">{c.orderId}</span>
          <span style={{ fontWeight: 600 }}>{formatCny(c.amountCny)}</span>
          <span>发起于 {formatTime(c.createdAt)}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn btn-primary">
            <CheckCircle2 size={14} />
            接手此案
          </button>
          <button className="btn">
            <MessageSquare size={14} />
            打开对话
          </button>
          <button className="btn">
            <Phone size={14} />
            回拨客户
          </button>
          <button className="btn">
            <ArrowUpRight size={14} />
            再升级 L{Math.min(c.level + 1, 3)}
          </button>
          <button className="btn btn-danger">
            <Ban size={14} />
            驳回转接
          </button>
        </div>
      </header>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
        {/* AI Summary Card */}
        <div
          style={{
            background: "linear-gradient(135deg, #eef2ff, #faf5ff)",
            border: "1px solid var(--primary-100)",
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 22
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--primary)",
              marginBottom: 4
            }}
          >
            AI 案情摘要
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--danger)",
              marginBottom: 8,
              padding: "4px 8px",
              background: "var(--danger-50)",
              borderRadius: 6,
              display: "inline-block"
            }}
          >
            {c.keyJudgment}
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-1)",
              lineHeight: 1.6,
              margin: "0 0 12px"
            }}
          >
            {c.aiSummary}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              fontSize: 12
            }}
          >
            <div>
              <div style={{ color: "var(--text-3)", marginBottom: 3 }}>
                场景迁移
              </div>
              <div style={{ color: "var(--text-1)" }}>
                {c.sceneTrace.join(" → ")}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-3)", marginBottom: 3 }}>
                证据完整度
              </div>
              <div>
                <span style={{ color: "var(--success)" }}>
                  {c.evidenceCollected.length} 已收集
                </span>
                {c.evidenceMissing.length > 0 && (
                  <span style={{ color: "var(--danger)", marginLeft: 6 }}>
                    {c.evidenceMissing.length} 缺失
                  </span>
                )}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-3)", marginBottom: 3 }}>
                AI 推荐
              </div>
              <div style={{ color: "var(--text-1)" }}>
                {c.recommendedActions[0] ?? "-"}
              </div>
            </div>
          </div>
        </div>

        {/* Conversation Timeline */}
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-2)",
            marginBottom: 12
          }}
        >
          对话时间线
        </h3>
        <div style={{ paddingLeft: 20, position: "relative", marginBottom: 22 }}>
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 6,
              top: 4,
              bottom: 4,
              width: 2,
              background: "var(--border)"
            }}
          />
          {c.sceneTrace.map((scene, i) => {
            const isRisk = scene.includes("情绪") || scene.includes("欺诈") || scene.includes("对抗");
            const isAi = scene.includes("AI") || scene.includes("退换") || scene.includes("兼容");
            const dotColor = isRisk
              ? "var(--danger)"
              : isAi
              ? "var(--primary)"
              : "var(--text-3)";

            return (
              <div
                key={i}
                style={{
                  position: "relative",
                  paddingLeft: 18,
                  paddingBottom: 14,
                  fontSize: 13,
                  color: "var(--text-1)"
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -14,
                    top: 5,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: dotColor,
                    border: "2px solid #fff",
                    boxShadow: "0 0 0 2px " + dotColor
                  }}
                />
                <span>{scene}</span>
              </div>
            );
          })}
        </div>

        {/* Tool Calls */}
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-2)",
            marginBottom: 12
          }}
        >
          工具调用记录
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(c.toolCalls.length, 3)}, 1fr)`,
            gap: 10
          }}
        >
          {c.toolCalls.map((tc, i) => (
            <div
              key={i}
              style={{
                padding: "12px",
                borderRadius: 10,
                border: `1px solid ${
                  tc.status === "error" ? "#fecaca" : "var(--border)"
                }`,
                background:
                  tc.status === "error" ? "var(--danger-50)" : "var(--bg)"
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 4,
                  color:
                    tc.status === "error"
                      ? "var(--danger)"
                      : "var(--text-1)"
                }}
              >
                {tc.name}
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--text-2)",
                  lineHeight: 1.45
                }}
              >
                {tc.result}
              </div>
              <div style={{ marginTop: 6 }}>
                <span
                  className={`pill ${
                    tc.status === "ok" ? "pill-success" : "pill-danger"
                  }`}
                >
                  {tc.status === "ok" ? "OK" : "异常"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
