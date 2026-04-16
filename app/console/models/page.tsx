"use client";

import { useState } from "react";
import { MOCK_MODELS, MOCK_ROUTE_PLANS } from "@/lib/mock-data";
import { Cpu, CheckCircle, Zap, Play } from "lucide-react";

const PROVIDER_LABELS: Record<string, { label: string; color: string }> = {
  zhipu: { label: "智谱", color: "#3b82f6" },
  siliconflow: { label: "硅基流动", color: "#8b5cf6" },
  openai: { label: "OpenAI", color: "#10b981" },
  anthropic: { label: "Anthropic", color: "#ef4444" },
  custom: { label: "Custom", color: "var(--text-3)" }
};

export default function ModelsPage() {
  const [activePlanId, setActivePlanId] = useState(
    MOCK_ROUTE_PLANS.find((p) => p.isActive)?.id ?? null
  );
  const [activating, setActivating] = useState<string | null>(null);

  async function handleActivate(planId: string) {
    setActivating(planId);
    try {
      await fetch(`/api/route-plans/${planId}/activate`, { method: "POST" });
      setActivePlanId(planId);
    } finally {
      setActivating(null);
    }
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700 }}>
        模型路由
      </h1>

      {/* Model Registry */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-2)",
          margin: "0 0 12px"
        }}
      >
        模型注册表
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 28
        }}
      >
        {MOCK_MODELS.map((m) => {
          const provider = PROVIDER_LABELS[m.provider] ?? PROVIDER_LABELS.custom;
          return (
            <div key={m.id} className="card" style={{ padding: "14px 16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6
                }}
              >
                <span
                  className="pill"
                  style={{
                    background: provider.color + "18",
                    color: provider.color,
                    fontSize: 10
                  }}
                >
                  {provider.label}
                </span>
                {m.enabled && (
                  <CheckCircle
                    size={14}
                    style={{ color: "var(--success)" }}
                  />
                )}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                  wordBreak: "break-all"
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  flexWrap: "wrap",
                  marginBottom: 8
                }}
              >
                {m.capabilityTags.map((tag) => (
                  <span key={tag} className="pill pill-muted" style={{ fontSize: 10 }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 6,
                  fontSize: 11.5,
                  color: "var(--text-2)"
                }}
              >
                <div>
                  <div style={{ color: "var(--text-3)" }}>QPS</div>
                  <div style={{ fontWeight: 600 }}>{m.qps}</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-3)" }}>延迟</div>
                  <div style={{ fontWeight: 600 }}>{m.avgLatencyMs}ms</div>
                </div>
                <div>
                  <div style={{ color: "var(--text-3)" }}>可用率</div>
                  <div style={{ fontWeight: 600 }}>
                    {(m.availability * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11.5,
                  color:
                    m.costPer1kInput === 0 ? "var(--success)" : "var(--text-2)"
                }}
              >
                {m.costPer1kInput === 0 ? "免费" : `¥${m.costPer1kInput}/1k tokens`}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 8
                }}
              >
                <button className="btn" style={{ flex: 1, justifyContent: "center", fontSize: 12 }}>
                  <Play size={12} />
                  测试
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Route Plans */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-2)",
          margin: "0 0 12px"
        }}
      >
        路由方案
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {MOCK_ROUTE_PLANS.map((plan) => {
          const fallback = MOCK_MODELS.find((m) => m.id === plan.fallbackModelId);
          const isActive = plan.id === activePlanId;
          return (
            <div
              key={plan.id}
              className="card"
              style={{
                padding: "16px 20px",
                borderColor: isActive ? "var(--primary)" : undefined,
                borderWidth: isActive ? 2 : 1
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      marginRight: 8
                    }}
                  >
                    {plan.name}
                  </span>
                  <span className="pill pill-muted">{plan.version}</span>
                  {isActive && (
                    <span className="pill pill-success" style={{ marginLeft: 6 }}>
                      激活中
                    </span>
                  )}
                </div>
                {!isActive && (
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: 12 }}
                    disabled={activating === plan.id}
                    onClick={() => handleActivate(plan.id)}
                  >
                    <Zap size={13} />
                    {activating === plan.id ? "激活中…" : "激活"}
                  </button>
                )}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--text-3)",
                  marginBottom: 10
                }}
              >
                {plan.description}
              </div>

              {/* Rules table */}
              <table className="table">
                <thead>
                  <tr>
                    <th>条件</th>
                    <th>说明</th>
                    <th>模型</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rules.map((rule) => {
                    const model = MOCK_MODELS.find((m) => m.id === rule.modelId);
                    return (
                      <tr key={rule.id}>
                        <td className="mono" style={{ fontSize: 12 }}>
                          {rule.condition.field} {rule.condition.op} &quot;{rule.condition.value}&quot;
                        </td>
                        <td>{rule.description}</td>
                        <td>
                          <span className="pill pill-primary" style={{ fontSize: 11 }}>
                            {model?.name ?? rule.modelId}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="mono" style={{ fontSize: 12, color: "var(--text-3)" }}>
                      * (fallback)
                    </td>
                    <td style={{ color: "var(--text-3)" }}>默认兜底</td>
                    <td>
                      <span className="pill pill-muted" style={{ fontSize: 11 }}>
                        {fallback?.name ?? plan.fallbackModelId}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
