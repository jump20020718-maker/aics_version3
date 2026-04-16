"use client";

import { useState } from "react";
import type { HandoffCaseItem } from "@/lib/mock-data";
import {
  AlertTriangle,
  DollarSign,
  FileX,
  Frown,
  Save
} from "lucide-react";

const REASON_ICONS: Record<string, React.ReactNode> = {
  highValue: <DollarSign size={14} style={{ color: "var(--warning)" }} />,
  riskHit: <AlertTriangle size={14} style={{ color: "var(--danger)" }} />,
  evidenceGap: <FileX size={14} style={{ color: "var(--primary)" }} />,
  emotion: <Frown size={14} style={{ color: "#e879f9" }} />
};

const REASON_LABELS: Record<string, string> = {
  highValue: "高客单价",
  riskHit: "风控命中",
  evidenceGap: "证据缺失",
  emotion: "情绪升温"
};

export function ActionPanel({ caseItem }: { caseItem: HandoffCaseItem }) {
  const [notes, setNotes] = useState("");
  const c = caseItem;

  // Build reason entries
  const reasons: Array<{ key: string; icon: React.ReactNode; label: string; detail?: string }> = [];
  if (c.reason.highValue) {
    reasons.push({
      key: "highValue",
      icon: REASON_ICONS.highValue,
      label: REASON_LABELS.highValue,
      detail: `订单金额 ${c.amountCny.toLocaleString()} 元`
    });
  }
  if (c.reason.riskHit?.length) {
    reasons.push({
      key: "riskHit",
      icon: REASON_ICONS.riskHit,
      label: REASON_LABELS.riskHit,
      detail: c.reason.riskHit.join(", ")
    });
  }
  if (c.reason.evidenceGap) {
    reasons.push({
      key: "evidenceGap",
      icon: REASON_ICONS.evidenceGap,
      label: REASON_LABELS.evidenceGap,
      detail: `${c.evidenceMissing.length} 项待补齐`
    });
  }
  if (c.reason.emotion) {
    reasons.push({
      key: "emotion",
      icon: REASON_ICONS.emotion,
      label: REASON_LABELS.emotion,
      detail: c.reason.emotion
    });
  }

  return (
    <aside
      style={{
        background: "#fff",
        overflowY: "auto",
        fontSize: 13
      }}
    >
      {/* Escalation Reasons */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-soft)"
        }}
      >
        <h4
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.02em"
          }}
        >
          升级原因
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reasons.map((r) => (
            <div
              key={r.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
                background: "var(--bg)",
                border: "1px solid var(--border-soft)"
              }}
            >
              {r.icon}
              <div>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{r.label}</div>
                {r.detail && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--text-3)",
                      marginTop: 1
                    }}
                  >
                    {r.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Actions */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid var(--border-soft)"
        }}
      >
        <h4
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.02em"
          }}
        >
          主管建议动作
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {c.recommendedActions.map((action, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 12.5,
                lineHeight: 1.45,
                color: "var(--text-1)"
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "var(--primary-50)",
                  color: "var(--primary)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 11,
                  fontWeight: 700
                }}
              >
                {i + 1}
              </span>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence Status */}
      {(c.evidenceCollected.length > 0 || c.evidenceMissing.length > 0) && (
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-soft)"
          }}
        >
          <h4
            style={{
              margin: "0 0 10px",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-2)",
              textTransform: "uppercase",
              letterSpacing: "0.02em"
            }}
          >
            证据状态
          </h4>
          {c.evidenceCollected.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {c.evidenceCollected.map((e) => (
                <div
                  key={e}
                  style={{
                    fontSize: 12,
                    color: "var(--success)",
                    padding: "2px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>✓</span> {e}
                </div>
              ))}
            </div>
          )}
          {c.evidenceMissing.length > 0 && (
            <div>
              {c.evidenceMissing.map((e) => (
                <div
                  key={e}
                  style={{
                    fontSize: 12,
                    color: "var(--danger)",
                    padding: "2px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>✗</span> {e}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Handoff Notes */}
      <div style={{ padding: "14px 18px" }}>
        <h4
          style={{
            margin: "0 0 10px",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-2)",
            textTransform: "uppercase",
            letterSpacing: "0.02em"
          }}
        >
          接管备注
        </h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="输入处理备注..."
          rows={4}
          style={{
            width: "100%",
            resize: "vertical",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            fontFamily: "inherit",
            lineHeight: 1.5,
            color: "var(--text-1)",
            outline: "none"
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--primary)";
            e.target.style.boxShadow = "0 0 0 3px rgba(79,70,229,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border)";
            e.target.style.boxShadow = "none";
          }}
        />
        <button
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
        >
          <Save size={14} />
          保存并接手
        </button>
      </div>
    </aside>
  );
}
