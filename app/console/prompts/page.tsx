"use client";

import { useState } from "react";
import { MOCK_PROMPTS } from "@/lib/mock-data";
import { FileText, Eye, CheckCircle } from "lucide-react";

export default function PromptsPage() {
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewing = MOCK_PROMPTS.find((p) => p.id === previewId);

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
          <FileText
            size={20}
            style={{ verticalAlign: "text-bottom", marginRight: 6 }}
          />
          Prompt 版本
        </h1>
        <button className="btn btn-primary">新建版本</button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead>
            <tr>
              <th>名称</th>
              <th>槽位</th>
              <th>版本</th>
              <th>状态</th>
              <th>测试通过率</th>
              <th>预览</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PROMPTS.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>
                  <span className="pill pill-muted" style={{ fontSize: 11 }}>
                    {p.slot}
                  </span>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>
                  {p.version}
                </td>
                <td>
                  {p.isActive ? (
                    <span className="pill pill-success">
                      <CheckCircle size={10} style={{ marginRight: 3 }} />
                      激活
                    </span>
                  ) : (
                    <span className="pill pill-muted">草稿</span>
                  )}
                </td>
                <td>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: "var(--border)",
                        overflow: "hidden",
                        minWidth: 60
                      }}
                    >
                      <div
                        style={{
                          width: `${(p.testPassRate * 100).toFixed(0)}%`,
                          height: "100%",
                          background:
                            p.testPassRate >= 0.85
                              ? "var(--success)"
                              : p.testPassRate >= 0.7
                              ? "var(--warning)"
                              : "var(--danger)",
                          borderRadius: 3
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          p.testPassRate >= 0.85
                            ? "var(--success)"
                            : p.testPassRate >= 0.7
                            ? "var(--warning)"
                            : "var(--danger)"
                      }}
                    >
                      {(p.testPassRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td
                  style={{
                    maxWidth: 200,
                    fontSize: 12,
                    color: "var(--text-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {p.preview}
                </td>
                <td>
                  <button
                    className="btn"
                    style={{ padding: "4px 8px" }}
                    onClick={() =>
                      setPreviewId(previewId === p.id ? null : p.id)
                    }
                  >
                    <Eye size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview panel */}
      {previewing && (
        <div
          className="card"
          style={{
            marginTop: 16,
            padding: "16px 20px",
            background: "#fafafa",
            border: "1px solid var(--border)"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {previewing.name} · {previewing.version} 预览
            </span>
            <button
              className="btn"
              style={{ padding: "2px 8px", fontSize: 12 }}
              onClick={() => setPreviewId(null)}
            >
              关闭
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 12.5,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--text-1)",
              fontFamily: "var(--font-mono, monospace)"
            }}
          >
            {previewing.preview}
          </pre>
        </div>
      )}
    </div>
  );
}
