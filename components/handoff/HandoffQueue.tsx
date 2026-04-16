"use client";

import type { HandoffCaseItem } from "@/lib/mock-data";
import { formatSla, formatCny } from "@/lib/format";
import { Clock } from "lucide-react";

type Filter = "all" | "L2" | "L3" | "sla_soon";

const FILTER_TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "L2", label: "L2" },
  { key: "L3", label: "L3" },
  { key: "sla_soon", label: "SLA 紧急" }
];

const LEVEL_COLORS: Record<number, { bg: string; fg: string }> = {
  1: { bg: "var(--primary-50)", fg: "var(--primary)" },
  2: { bg: "var(--warning-50)", fg: "var(--warning)" },
  3: { bg: "var(--danger-50)", fg: "var(--danger)" }
};

export function HandoffQueue({
  cases,
  selectedId,
  onSelect,
  filter,
  onFilterChange
}: {
  cases: HandoffCaseItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  filter: Filter;
  onFilterChange: (f: Filter) => void;
}) {
  return (
    <aside
      style={{
        borderRight: "1px solid var(--border)",
        background: "#fff",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "14px 18px 0",
          borderBottom: "1px solid var(--border-soft)"
        }}
      >
        <h2
          style={{
            margin: "0 0 10px",
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-1)"
          }}
        >
          Escalation Queue
        </h2>
        <div style={{ display: "flex", gap: 0 }}>
          {FILTER_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onFilterChange(t.key)}
              style={{
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: filter === t.key ? 600 : 400,
                color: filter === t.key ? "var(--primary)" : "var(--text-3)",
                background: "none",
                border: "none",
                borderBottom:
                  filter === t.key
                    ? "2px solid var(--primary)"
                    : "2px solid transparent",
                cursor: "pointer"
              }}
            >
              {t.label}
              {t.key === "all" && (
                <span
                  style={{
                    marginLeft: 4,
                    background: "var(--primary-50)",
                    color: "var(--primary)",
                    borderRadius: 999,
                    padding: "1px 6px",
                    fontSize: 10,
                    fontWeight: 600
                  }}
                >
                  {cases.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {cases.map((c) => {
          const sel = c.id === selectedId;
          const lc = LEVEL_COLORS[c.level] ?? LEVEL_COLORS[1];
          const sla = formatSla(c.slaDeadline);
          const slaUrgent =
            new Date(c.slaDeadline).getTime() - Date.now() < 15 * 60_000;

          return (
            <div
              key={c.id}
              onClick={() => onSelect(c.id)}
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid var(--border-soft)",
                cursor: "pointer",
                background: sel ? "var(--primary-50)" : "#fff",
                borderLeft: sel ? "3px solid var(--primary)" : "3px solid transparent",
                transition: "background 120ms"
              }}
            >
              {/* Level pill + SLA */}
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
                  style={{ background: lc.bg, color: lc.fg }}
                >
                  L{c.level}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    color: slaUrgent ? "var(--danger)" : "var(--text-3)",
                    fontWeight: slaUrgent ? 600 : 400
                  }}
                >
                  <Clock size={11} />
                  {sla.label}
                </span>
              </div>

              {/* Title */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-1)",
                  lineHeight: 1.35,
                  marginBottom: 4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
              >
                {c.title}
              </div>

              {/* Meta */}
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-3)",
                  display: "flex",
                  gap: 8,
                  marginBottom: 6
                }}
              >
                <span className="mono">{c.orderId}</span>
                <span>{c.customerName}</span>
                <span style={{ color: "var(--text-1)", fontWeight: 500 }}>
                  {formatCny(c.amountCny)}
                </span>
              </div>

              {/* Tags */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {c.tags.slice(1).map((tag) => (
                  <span
                    key={tag}
                    className={`pill ${
                      tag.includes("欺诈") || tag.includes("零容忍")
                        ? "pill-danger"
                        : tag.includes("情绪") || tag.includes("证据")
                        ? "pill-warning"
                        : "pill-muted"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
