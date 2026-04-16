"use client";

import { useState } from "react";
import { MOCK_HANDOFF_RULES } from "@/lib/mock-data";
import { ArrowUpRight, AlertTriangle } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  escalate_l1: "pill-warning",
  escalate_l2: "pill-danger",
  "escalate_l2 + freeze_below_l2": "pill-danger",
  escalate_l3: "pill-danger",
  "refuse + escalate_l2": "pill-danger",
  follow_up: "pill-primary"
};

export default function HandoffRulesPage() {
  const [rules, setRules] = useState(MOCK_HANDOFF_RULES);

  function toggleRule(id: string) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }

  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

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
          <ArrowUpRight
            size={20}
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          Handoff 阈值规则
        </h1>
        <button className="btn btn-primary">新建规则</button>
      </div>

      {/* Warning banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderRadius: 8,
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          marginBottom: 16,
          fontSize: 12.5,
          color: "#92400e"
        }}
      >
        <AlertTriangle size={14} />
        规则按优先级从低到高触发，数字越小优先级越高。启用状态变更立即生效。
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 50 }}>优先级</th>
              <th>规则名称</th>
              <th>触发条件</th>
              <th>动作</th>
              <th style={{ width: 80, textAlign: "center" }}>启用</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((rule) => (
              <tr
                key={rule.id}
                style={{
                  opacity: rule.enabled ? 1 : 0.45,
                  transition: "opacity 180ms"
                }}
              >
                <td style={{ textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background:
                        rule.priority <= 5
                          ? "#fee2e2"
                          : rule.priority <= 20
                          ? "#fef3c7"
                          : "var(--bg)",
                      color:
                        rule.priority <= 5
                          ? "var(--danger)"
                          : rule.priority <= 20
                          ? "#92400e"
                          : "var(--text-2)",
                      fontSize: 12,
                      fontWeight: 700
                    }}
                  >
                    {rule.priority}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{rule.name}</td>
                <td>
                  <code
                    style={{
                      fontSize: 11.5,
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      color: "var(--text-1)"
                    }}
                  >
                    {rule.condition}
                  </code>
                </td>
                <td>
                  <span
                    className={`pill ${ACTION_COLORS[rule.action] ?? "pill-muted"}`}
                    style={{ fontSize: 11 }}
                  >
                    {rule.action}
                  </span>
                </td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    style={{
                      width: 36,
                      height: 20,
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      background: rule.enabled ? "var(--primary)" : "var(--border)",
                      position: "relative",
                      transition: "background 180ms",
                      flexShrink: 0
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: rule.enabled ? 18 : 2,
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
