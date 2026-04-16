"use client";

import { MOCK_RETRIEVAL_STRATEGIES } from "@/lib/mock-data";
import { Search, CheckCircle, Zap } from "lucide-react";

const RECALL_MODE_LABELS: Record<string, string> = {
  hybrid: "混合检索",
  dense: "向量检索",
  sparse: "稀疏检索"
};

export default function RetrievalPage() {
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
          <Search
            size={20}
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          检索策略
        </h1>
        <button className="btn btn-primary">新建策略</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {MOCK_RETRIEVAL_STRATEGIES.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{
              padding: "18px 22px",
              borderColor: s.isActive ? "var(--primary)" : undefined,
              borderWidth: s.isActive ? 2 : 1
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{s.name}</span>
                <span className="pill pill-muted" style={{ fontSize: 11 }}>
                  {s.version}
                </span>
                {s.isActive && (
                  <span className="pill pill-success">
                    <CheckCircle size={10} style={{ marginRight: 3 }} />
                    激活中
                  </span>
                )}
              </div>
              {!s.isActive && (
                <button className="btn btn-primary" style={{ fontSize: 12 }}>
                  <Zap size={13} />
                  激活
                </button>
              )}
            </div>

            {/* Config grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12
              }}
            >
              <ConfigItem
                label="召回模式"
                value={RECALL_MODE_LABELS[s.recallMode] ?? s.recallMode}
                highlight
              />
              <ConfigItem label="向量模型" value={s.denseModel} />
              <ConfigItem label="Top-K" value={String(s.topK)} />
              <ConfigItem
                label="Rerank"
                value={s.rerankEnabled ? `✓ ${s.rerankModel ?? ""}` : "关闭"}
                good={s.rerankEnabled}
              />
              <ConfigItem
                label="Tier 过滤"
                value={`[${s.tierFilter.join(", ")}]`}
              />
              <ConfigItem
                label="置信度门槛"
                value={String(s.confidenceFloor)}
              />
              <ConfigItem
                label="引用阈值"
                value={String(s.citeThreshold)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfigItem({
  label,
  value,
  highlight,
  good
}: {
  label: string;
  value: string;
  highlight?: boolean;
  good?: boolean;
}) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 8,
        background: "var(--bg)",
        border: "1px solid var(--border)"
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.04em"
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: highlight
            ? "var(--primary)"
            : good === true
            ? "var(--success)"
            : good === false
            ? "var(--text-3)"
            : "var(--text-1)",
          fontFamily: "var(--font-mono, monospace)"
        }}
      >
        {value}
      </div>
    </div>
  );
}
