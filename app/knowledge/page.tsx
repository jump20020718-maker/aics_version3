"use client";

import { useState } from "react";
import { MOCK_KNOWLEDGE_DOCS } from "@/lib/mock-data";
import { BookOpen, Search, AlertTriangle } from "lucide-react";

type TierFilter = "all" | 1 | 2 | 3 | 4;

const TIER_LABELS: Record<number, { label: string; cls: string }> = {
  1: { label: "Tier 1 · 核心", cls: "pill-danger" },
  2: { label: "Tier 2 · 重要", cls: "pill-warning" },
  3: { label: "Tier 3 · 辅助", cls: "pill-primary" },
  4: { label: "Tier 4 · 待替换", cls: "pill-muted" }
};

const DOC_TYPE_LABELS: Record<string, string> = {
  warranty: "保修",
  sop: "SOP",
  policy: "政策",
  compatibility: "兼容性",
  risk: "风控",
  faq: "FAQ"
};

export default function KnowledgePage() {
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = MOCK_KNOWLEDGE_DOCS.filter((doc) => {
    if (tierFilter !== "all" && doc.tier !== tierFilter) return false;
    if (search && !doc.title.toLowerCase().includes(search.toLowerCase()) && !doc.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "22px 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          <BookOpen
            size={20}
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          知识库文档
        </h1>
        <button className="btn btn-primary">上传文档</button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "6px 12px",
            background: "#fff",
            flex: 1,
            maxWidth: 320
          }}
        >
          <Search size={14} style={{ color: "var(--text-3)" }} />
          <input
            type="text"
            placeholder="搜索文档名称或 ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              flex: 1,
              fontSize: 13,
              background: "transparent"
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", 1, 2, 3, 4] as TierFilter[]).map((t) => (
            <button
              key={String(t)}
              className="btn"
              onClick={() => setTierFilter(t)}
              style={{
                fontSize: 12,
                background: tierFilter === t ? "var(--primary)" : undefined,
                color: tierFilter === t ? "#fff" : undefined,
                borderColor: tierFilter === t ? "var(--primary)" : undefined
              }}
            >
              {t === "all" ? "全部" : `Tier ${t}`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>文档 ID</th>
              <th>标题</th>
              <th>Tier</th>
              <th>类型</th>
              <th>品牌</th>
              <th>更新日期</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((doc) => {
              const tier = TIER_LABELS[doc.tier] ?? TIER_LABELS[4];
              return (
                <tr key={doc.id}>
                  <td
                    className="mono"
                    style={{
                      fontSize: 11.5,
                      maxWidth: 200,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {doc.id}
                  </td>
                  <td style={{ fontWeight: 500 }}>{doc.title}</td>
                  <td>
                    <span className={`pill ${tier.cls}`} style={{ fontSize: 10.5 }}>
                      {tier.label}
                    </span>
                  </td>
                  <td>
                    <span className="pill pill-muted" style={{ fontSize: 11 }}>
                      {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: doc.brand ? "var(--text-1)" : "var(--text-3)" }}>
                    {doc.brand ?? "—"}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {doc.updated}
                  </td>
                  <td>
                    {doc.replace ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: "#92400e",
                          background: "#fffbeb",
                          border: "1px solid #fcd34d",
                          borderRadius: 6,
                          padding: "2px 8px"
                        }}
                      >
                        <AlertTriangle size={10} />
                        synthetic
                      </span>
                    ) : (
                      <span className="pill pill-success" style={{ fontSize: 11 }}>
                        正式
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div
        style={{
          marginTop: 14,
          fontSize: 12,
          color: "var(--text-3)",
          display: "flex",
          gap: 16
        }}
      >
        <span>共 {MOCK_KNOWLEDGE_DOCS.length} 篇文档</span>
        <span>当前筛选 {filtered.length} 篇</span>
        <span>
          Synthetic 待替换：{MOCK_KNOWLEDGE_DOCS.filter((d) => d.replace).length} 篇
        </span>
      </div>
    </div>
  );
}
