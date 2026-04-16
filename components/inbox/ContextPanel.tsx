"use client";

import type { SessionItem } from "@/lib/mock-data";
import { formatCny } from "@/lib/format";
import {
  AlertTriangle,
  User,
  Package,
  FileSearch,
  CheckCircle2,
  Circle,
  AlertCircle,
  Zap
} from "lucide-react";

export function ContextPanel({ session }: { session: SessionItem }) {
  // 从最后一条 assistant 消息提取 citations
  const lastAi = [...session.messages].reverse().find((m) => m.role === "assistant");
  const citations = lastAi?.citations ?? [];

  return (
    <aside
      style={{
        background: "#fff",
        overflowY: "auto",
        padding: "0",
        fontSize: 13
      }}
    >
      {/* 风控 Banner */}
      {session.riskSignals.length > 0 && (
        <div
          style={{
            background: "var(--danger-50)",
            borderBottom: "1px solid #fecaca",
            padding: "10px 18px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--danger)"
          }}
        >
          <AlertTriangle size={16} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 12.5 }}>风控信号命中</div>
            <div style={{ fontSize: 12, color: "#991b1b", marginTop: 2 }}>
              {session.riskSignals.map((s) => (
                <span key={s} className="pill pill-danger" style={{ marginRight: 4 }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 客户卡 */}
      <Section icon={<User size={14} />} title="客户档案">
        <KV label="姓名" value={session.customerName} />
        <KV
          label="等级"
          value={
            <span
              className={`pill ${
                session.customerLevel === "VIP" ? "pill-warning" : "pill-muted"
              }`}
            >
              {session.customerLevel}
            </span>
          }
        />
        <KV label="城市" value={session.customerCity} />
        <KV label="渠道" value={session.channel} />
        {session.totalAmountCny != null && (
          <KV label="订单金额" value={formatCny(session.totalAmountCny)} />
        )}
      </Section>

      {/* 订单卡 */}
      {session.orderId && (
        <Section icon={<Package size={14} />} title="订单信息">
          <KV label="订单号" value={<span className="mono">{session.orderId}</span>} />
          {session.skuBrand && <KV label="商品" value={session.skuBrand} />}
          {session.shipmentStatus && (
            <KV
              label="物流"
              value={
                <span
                  style={{
                    color:
                      session.shipmentStatus === "delivered"
                        ? "var(--success)"
                        : session.shipmentStatus === "exception"
                        ? "var(--danger)"
                        : "var(--warning)",
                    fontWeight: 500
                  }}
                >
                  {session.shipmentStatus}
                </span>
              }
            />
          )}
          {session.emotionState && (
            <KV
              label="情绪"
              value={
                <span
                  className={`pill ${
                    session.emotionState === "angry"
                      ? "pill-danger"
                      : session.emotionState === "neutral"
                      ? "pill-muted"
                      : "pill-success"
                  }`}
                >
                  {session.emotionState}
                </span>
              }
            />
          )}
        </Section>
      )}

      {/* RAG 引用 */}
      {citations.length > 0 && (
        <Section icon={<FileSearch size={14} />} title="本轮检索命中">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {citations.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid var(--border-soft)",
                  background: "var(--bg)",
                  fontSize: 12
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4
                  }}
                >
                  <span
                    className={`pill ${
                      c.tier === 1
                        ? "pill-success"
                        : c.tier === 2
                        ? "pill-primary"
                        : c.tier === 3
                        ? "pill-warning"
                        : "pill-muted"
                    }`}
                    style={{ fontSize: 10 }}
                  >
                    tier-{c.tier}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: 11.5 }}>{c.title}</span>
                </div>
                <div
                  style={{
                    color: "var(--text-3)",
                    fontSize: 11.5,
                    lineHeight: 1.45,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {c.snippet}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: "var(--text-3)"
                  }}
                >
                  sim: {c.simScore.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 证据清单 */}
      {session.evidence.length > 0 && (
        <Section icon={<CheckCircle2 size={14} />} title="证据清单">
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {session.evidence.map((e) => (
              <div
                key={e.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5
                }}
              >
                {e.done ? (
                  <CheckCircle2
                    size={15}
                    style={{ color: "var(--success)", flexShrink: 0 }}
                  />
                ) : e.required ? (
                  <AlertCircle
                    size={15}
                    style={{ color: "var(--danger)", flexShrink: 0 }}
                  />
                ) : (
                  <Circle
                    size={15}
                    style={{ color: "var(--text-3)", flexShrink: 0 }}
                  />
                )}
                <span
                  style={{
                    color: e.done ? "var(--text-2)" : "var(--text-1)",
                    textDecoration: e.done ? "line-through" : "none"
                  }}
                >
                  {e.label}
                </span>
                {e.required && !e.done && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "var(--danger)",
                      fontWeight: 500,
                      marginLeft: "auto"
                    }}
                  >
                    必填
                  </span>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 推荐动作 */}
      {session.suggestedActions.length > 0 && (
        <Section icon={<Zap size={14} />} title="下一步动作">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {session.suggestedActions.map((a) => (
              <button
                key={a.key}
                className={`btn ${
                  a.kind === "primary"
                    ? "btn-primary"
                    : a.kind === "warn"
                    ? "btn-danger"
                    : ""
                }`}
                style={{ width: "100%", justifyContent: "center" }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Section>
      )}
    </aside>
  );
}

/* ---- helpers ---- */

function Section({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: "14px 18px",
        borderBottom: "1px solid var(--border-soft)"
      }}
    >
      <h4
        style={{
          margin: "0 0 10px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-2)",
          textTransform: "uppercase",
          letterSpacing: "0.02em"
        }}
      >
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function KV({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "3px 0",
        fontSize: 12.5
      }}
    >
      <span style={{ color: "var(--text-3)" }}>{label}</span>
      <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
