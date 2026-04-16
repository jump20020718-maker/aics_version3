"use client";

import type { SessionItem } from "@/lib/mock-data";
import { formatTime } from "@/lib/format";

const FILTERS = [
  { key: "ai_working", label: "AI 处理中" },
  { key: "waiting_handoff", label: "待接管" },
  { key: "high_risk", label: "高风险" }
] as const;

export function InboxList({
  sessions,
  selectedId,
  onSelect,
  filter,
  onFilterChange
}: {
  sessions: SessionItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: string;
  onFilterChange: (f: any) => void;
}) {
  return (
    <aside
      style={{
        background: "#fff",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}
    >
      <div style={{ padding: "14px 16px 10px", borderBottom: "1px solid var(--border-soft)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10
          }}
        >
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Inbox</h2>
          <span
            style={{
              background: "var(--primary-50)",
              color: "var(--primary)",
              padding: "2px 7px",
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 600
            }}
          >
            {sessions.length}
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => onFilterChange(f.key)}
                style={{
                  padding: "4px 9px",
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: "pointer",
                  border: "none",
                  background: active ? "var(--text-1)" : "transparent",
                  color: active ? "#fff" : "var(--text-2)"
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {sessions.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: active ? "12px 16px 12px 13px" : "12px 16px",
                borderBottom: "1px solid var(--border-soft)",
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "32px 1fr auto",
                gap: 10,
                alignItems: "start",
                background: active ? "var(--primary-50)" : "transparent",
                borderLeft: active ? "3px solid var(--primary)" : "3px solid transparent",
                border: "none",
                borderBottomColor: "var(--border-soft)"
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 11.5,
                  background: s.avatarColor
                }}
              >
                {s.initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 2
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--text-1)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {s.customerName} · {s.customerCity}
                  </span>
                  <span
                    style={{
                      color: "var(--text-3)",
                      fontSize: 11.5,
                      flexShrink: 0,
                      marginLeft: 6
                    }}
                  >
                    {formatTime(s.lastActiveAt)}
                  </span>
                </div>
                <div
                  style={{
                    color: "var(--text-2)",
                    fontSize: 12.5,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {s.preview}
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {s.tags.map((t, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 10.5,
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 500,
                        lineHeight: 1.4,
                        background:
                          t.type === "risk"
                            ? "#fef2f2"
                            : t.type === "emo"
                            ? "#fff7ed"
                            : t.type === "tran"
                            ? "#f0f9ff"
                            : "#eef2ff",
                        color:
                          t.type === "risk"
                            ? "#b91c1c"
                            : t.type === "emo"
                            ? "#c2410c"
                            : t.type === "tran"
                            ? "#0369a1"
                            : "#4338ca"
                      }}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
              {s.unread && (
                <div
                  style={{
                    alignSelf: "start",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    marginTop: 8
                  }}
                />
              )}
            </button>
          );
        })}
        {sessions.length === 0 && (
          <div style={{ padding: 20, color: "var(--text-3)", fontSize: 12, textAlign: "center" }}>
            当前筛选下暂无会话
          </div>
        )}
      </div>
    </aside>
  );
}
