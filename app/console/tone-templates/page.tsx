"use client";

import { useState } from "react";
import { MOCK_TONE_TEMPLATES } from "@/lib/mock-data";
import { MessageSquare } from "lucide-react";

const CATEGORY_LABELS: Record<string, { label: string; cls: string }> = {
  damage:   { label: "破损", cls: "pill-warning" },
  angry:    { label: "情绪激动", cls: "pill-danger" },
  threat:   { label: "威胁", cls: "pill-danger" },
  sympathy: { label: "同情安抚", cls: "pill-primary" },
  default:  { label: "默认", cls: "pill-muted" }
};

export default function ToneTemplatesPage() {
  const [templates, setTemplates] = useState(MOCK_TONE_TEMPLATES);

  function toggleTemplate(id: string) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          <MessageSquare
            size={20}
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          情绪话术模板
        </h1>
        <button className="btn btn-primary">新建模板</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>模板名称</th>
              <th>分类</th>
              <th>版本</th>
              <th>摘要</th>
              <th style={{ width: 80, textAlign: "center" }}>启用</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const cat = CATEGORY_LABELS[t.category] ?? CATEGORY_LABELS.default;
              return (
                <tr
                  key={t.id}
                  style={{
                    opacity: t.enabled ? 1 : 0.45,
                    transition: "opacity 180ms"
                  }}
                >
                  <td style={{ fontWeight: 500, fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}>
                    {t.name}
                  </td>
                  <td>
                    <span className={`pill ${cat.cls}`} style={{ fontSize: 11 }}>
                      {cat.label}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {t.version}
                  </td>
                  <td style={{ fontSize: 13, color: "var(--text-2)" }}>
                    {t.summary}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <button
                      onClick={() => toggleTemplate(t.id)}
                      style={{
                        width: 36,
                        height: 20,
                        borderRadius: 10,
                        border: "none",
                        cursor: "pointer",
                        background: t.enabled ? "var(--primary)" : "var(--border)",
                        position: "relative",
                        transition: "background 180ms"
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: t.enabled ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#fff",
                          transition: "left 180ms",
                          boxShadow: "0 1px 3px rgba(0,0,0,.2)"
                        }}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info callout */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 8,
          background: "linear-gradient(135deg, #eef2ff, #faf5ff)",
          border: "1px solid var(--primary-100)",
          fontSize: 12.5,
          color: "var(--text-2)"
        }}
      >
        <strong style={{ color: "var(--primary)" }}>说明：</strong>
        情绪话术模板由 A/B Test 实验台驱动，当前激活版本可在
        <strong>「A/B Test 实验台」</strong>页面对比效果指标后切换。
        启用状态变更立即生效。
      </div>
    </div>
  );
}
