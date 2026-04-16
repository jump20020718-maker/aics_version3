"use client";

import { useState } from "react";
import { MOCK_BADCASES } from "@/lib/mock-data";
import { formatTime } from "@/lib/format";
import { Bug, ExternalLink } from "lucide-react";

type AttrFilter = "all" | "HALLUCINATION" | "RAG_MISS" | "TONE_VIOLATION";

const ATTR_COLORS: Record<string, string> = {
  HALLUCINATION: "pill-danger",
  RAG_MISS: "pill-warning",
  TONE_VIOLATION: "pill-primary",
  POLICY_UNKNOWN: "pill-muted",
  MIXED: "pill-muted",
  UNCLASSIFIED: "pill-muted"
};

const SEVERITY_COLORS: Record<string, string> = {
  P0: "pill-danger",
  P1: "pill-warning",
  P2: "pill-muted"
};

export default function BadcasesPage() {
  const [attrFilter, setAttrFilter] = useState<AttrFilter>("all");

  const filtered =
    attrFilter === "all"
      ? MOCK_BADCASES
      : MOCK_BADCASES.filter((b) => b.attribution === attrFilter);

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
          <Bug
            size={20}
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          Badcase 池
        </h1>
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "HALLUCINATION", "RAG_MISS", "TONE_VIOLATION"] as AttrFilter[]).map(
            (f) => (
              <button
                key={f}
                className="btn"
                onClick={() => setAttrFilter(f)}
                style={{
                  fontSize: 12,
                  background: attrFilter === f ? "var(--primary)" : undefined,
                  color: attrFilter === f ? "#fff" : undefined,
                  borderColor: attrFilter === f ? "var(--primary)" : undefined
                }}
              >
                {f === "all" ? "全部" : f}
              </button>
            )
          )}
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>场景</th>
              <th>归因</th>
              <th>严重度</th>
              <th>AI 输出</th>
              <th>Gold Rule</th>
              <th>状态</th>
              <th>修复进度</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((bc) => (
              <tr key={bc.id}>
                <td className="mono" style={{ fontSize: 12 }}>
                  {bc.id}
                </td>
                <td>
                  <span className="pill pill-muted">{bc.sceneCode}</span>
                </td>
                <td>
                  <span className={`pill ${ATTR_COLORS[bc.attribution] ?? "pill-muted"}`}>
                    {bc.attribution}
                  </span>
                </td>
                <td>
                  <span className={`pill ${SEVERITY_COLORS[bc.severity] ?? "pill-muted"}`}>
                    {bc.severity}
                  </span>
                </td>
                <td
                  style={{
                    maxWidth: 180,
                    fontSize: 12,
                    color: "var(--danger)"
                  }}
                >
                  <div
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {bc.aiOutput}
                  </div>
                </td>
                <td
                  style={{
                    maxWidth: 180,
                    fontSize: 12,
                    color: "var(--success)"
                  }}
                >
                  <div
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}
                  >
                    {bc.goldRule}
                  </div>
                </td>
                <td>
                  <span
                    className={`pill ${
                      bc.status === "closed"
                        ? "pill-success"
                        : bc.status === "in_fix"
                        ? "pill-warning"
                        : "pill-primary"
                    }`}
                  >
                    {bc.status}
                  </span>
                </td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      fontSize: 11.5
                    }}
                  >
                    {bc.fixActions.map((a, i) => (
                      <span key={i}>
                        {a.status === "done"
                          ? "✓"
                          : a.status === "doing"
                          ? "◐"
                          : "☐"}{" "}
                        {a.type}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <button className="btn" style={{ padding: "4px 8px" }}>
                    <ExternalLink size={13} />
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
