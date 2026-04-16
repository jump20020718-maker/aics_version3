"use client";

import { Settings, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";

const API_KEYS = [
  { provider: "智谱 AI (GLM)", key: "glm_sk_****************************3f8a", enabled: true },
  { provider: "硅基流动 (SiliconFlow)", key: "sf_sk_****************************7d2e", enabled: true },
  { provider: "OpenAI (备用)", key: "sk-****************************未配置", enabled: false }
];

const PROVIDER_CONFIG = [
  { name: "智谱 AI", endpoint: "https://open.bigmodel.cn/api/paas/v4", status: "connected" as const },
  { name: "硅基流动", endpoint: "https://api.siliconflow.cn/v1", status: "connected" as const },
  { name: "OpenAI", endpoint: "https://api.openai.com/v1", status: "not_configured" as const }
];

const FEATURE_FLAGS = [
  { key: "sse_reasoning", label: "SSE 推理过程可见", desc: "在聊天气泡中实时展示 AI thinking/reasoning 过程", default: true },
  { key: "sse_citation", label: "SSE Citation 引用", desc: "回复末尾自动附加 RAG 引用来源卡片", default: true },
  { key: "trace_replay", label: "Trace 回放", desc: "允许在 /trace/:id 页面回放完整处理流程", default: true },
  { key: "risk_gate_block", label: "风险门槛自动阻断", desc: "风险门槛未达标时自动阻止上线", default: false },
  { key: "ab_auto_stop", label: "A/B Test 自动停组", desc: "当守护指标破线时自动停止劣势组流量", default: true },
  { key: "badcase_auto_ingest", label: "Badcase 自动收录", desc: "非正常转人工自动进入 badcase 池", default: true }
];

export default function SettingsPage() {
  const [flags, setFlags] = useState(
    FEATURE_FLAGS.map((f) => ({ ...f, enabled: f.default }))
  );
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  function toggleFlag(key: string) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled: !f.enabled } : f))
    );
  }

  function toggleKeyVisibility(provider: string) {
    setShowKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700 }}>
        <Settings
          size={20}
          style={{ verticalAlign: "text-bottom", marginRight: 6 }}
        />
        系统设置
      </h1>

      {/* API Keys */}
      <Section title="API Keys">
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Provider</th>
                <th>API Key</th>
                <th style={{ width: 80, textAlign: "center" }}>状态</th>
              </tr>
            </thead>
            <tbody>
              {API_KEYS.map((k) => (
                <tr key={k.provider}>
                  <td style={{ fontWeight: 500 }}>{k.provider}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <code
                        style={{
                          fontSize: 12,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          padding: "3px 8px",
                          color: "var(--text-2)",
                          flex: 1
                        }}
                      >
                        {showKeys[k.provider] ? k.key.replace(/\*/g, "x") : k.key}
                      </code>
                      <button
                        className="btn"
                        style={{ padding: "4px 6px" }}
                        onClick={() => toggleKeyVisibility(k.provider)}
                      >
                        {showKeys[k.provider] ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span
                      className={`pill ${k.enabled ? "pill-success" : "pill-muted"}`}
                    >
                      {k.enabled ? "已配置" : "未配置"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Provider endpoints */}
      <Section title="Provider 配置">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12
          }}
        >
          {PROVIDER_CONFIG.map((p) => (
            <div
              key={p.name}
              className="card"
              style={{ padding: "14px 16px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  {p.name}
                </span>
                <span
                  className={`pill ${
                    p.status === "connected" ? "pill-success" : "pill-muted"
                  }`}
                  style={{ fontSize: 10 }}
                >
                  {p.status === "connected" ? "已连接" : "未配置"}
                </span>
              </div>
              <code
                style={{
                  fontSize: 11,
                  color: "var(--text-3)",
                  wordBreak: "break-all"
                }}
              >
                {p.endpoint}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Feature flags */}
      <Section title="特性开关">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {flags.map((f, i) => (
            <div
              key={f.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderBottom:
                  i < flags.length - 1 ? "1px solid var(--border)" : "none"
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {f.desc}
                </div>
              </div>
              <button
                onClick={() => toggleFlag(f.key)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  color: f.enabled ? "var(--primary)" : "var(--text-3)",
                  flexShrink: 0
                }}
              >
                {f.enabled ? (
                  <ToggleRight size={28} />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Demo notice */}
      <div
        style={{
          marginTop: 20,
          padding: "10px 14px",
          borderRadius: 8,
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          fontSize: 12,
          color: "#92400e"
        }}
      >
        <strong>Demo 说明：</strong>
        本页面展示 AiServe 的可配置架构设计。生产环境中 API Key 会通过加密环境变量管理，特性开关通过数据库持久化。
      </div>
    </div>
  );
}

function Section({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-2)",
          margin: "0 0 12px"
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
