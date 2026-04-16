"use client";

import { useState } from "react";
import { MOCK_EXPERIMENTS } from "@/lib/mock-data";
import { FlaskConical, Pause, FileText, X } from "lucide-react";

type NewExpForm = {
  name: string;
  hypothesis: string;
  type: "prompt" | "tone" | "retrieval" | "handoff_threshold" | "model";
  splitA: number;
  splitB: number;
};

const INITIAL_FORM: NewExpForm = {
  name: "",
  hypothesis: "",
  type: "prompt",
  splitA: 50,
  splitB: 50
};

const EXP_TYPE_LABELS: Record<NewExpForm["type"], string> = {
  prompt: "Prompt A/B",
  tone: "情绪话术模板",
  retrieval: "检索策略",
  handoff_threshold: "Handoff 阈值",
  model: "模型路由"
};

export default function ExperimentsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(
    MOCK_EXPERIMENTS[0]?.id ?? null
  );
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewExpForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    // Demo: simulate async create
    setTimeout(() => {
      setSubmitting(false);
      setShowModal(false);
      setForm(INITIAL_FORM);
    }, 800);
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
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>A/B Test 实验台</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FlaskConical size={14} />
          新建实验
        </button>
      </div>

      {/* New Experiment Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div
            className="card"
            style={{ width: 480, padding: "24px 28px", position: "relative" }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "var(--text-3)" }}
            >
              <X size={16} />
            </button>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>新建 A/B 实验</h2>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>实验名称 *</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. 退款场景 tone 模板对比"
                  style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 13, outline: "none" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>实验假设 *</span>
                <input
                  required
                  value={form.hypothesis}
                  onChange={(e) => setForm((f) => ({ ...f, hypothesis: e.target.value }))}
                  placeholder="e.g. 先安抚再结论可降低升级率 15%"
                  style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 13, outline: "none" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>实验类型</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as NewExpForm["type"] }))}
                  style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 13, background: "#fff" }}
                >
                  {(Object.keys(EXP_TYPE_LABELS) as Array<NewExpForm["type"]>).map((k) => (
                    <option key={k} value={k}>{EXP_TYPE_LABELS[k]}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Variant A 流量 (%)</span>
                  <input
                    type="number" min={10} max={90}
                    value={form.splitA}
                    onChange={(e) => { const v = Number(e.target.value); setForm((f) => ({ ...f, splitA: v, splitB: 100 - v })); }}
                    style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 13 }}
                  />
                </label>
                <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>Variant B 流量 (%)</span>
                  <input readOnly value={form.splitB}
                    style={{ padding: "8px 10px", borderRadius: 7, border: "1px solid var(--border)", fontSize: 13, background: "var(--bg)", color: "var(--text-3)" }}
                  />
                </label>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)}>取消</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "创建中…" : "创建实验"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Experiment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {MOCK_EXPERIMENTS.map((exp) => {
          const expanded = expandedId === exp.id;
          return (
            <div key={exp.id} className="card" style={{ overflow: "hidden" }}>
              {/* Header */}
              <div
                onClick={() => setExpandedId(expanded ? null : exp.id)}
                style={{
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  background: expanded ? "var(--primary-50)" : "#fff"
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                    {exp.name}
                  </h3>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      marginTop: 3
                    }}
                  >
                    {exp.hypothesis}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12
                  }}
                >
                  <span className="pill pill-success">{exp.status}</span>
                  <span style={{ color: "var(--text-3)" }}>
                    {exp.days} 天 · {exp.sessions} 会话
                  </span>
                  <span style={{ color: "var(--text-3)" }}>
                    {exp.splitRatio.A}/{exp.splitRatio.B}
                  </span>
                  <button
                    className="btn"
                    style={{ padding: "4px 8px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileText size={13} />
                  </button>
                  <button
                    className="btn"
                    style={{ padding: "4px 8px" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pause size={13} />
                  </button>
                </div>
              </div>

              {/* Detail */}
              {expanded && (
                <div style={{ padding: "0 20px 20px" }}>
                  {/* Variant cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 14,
                      marginTop: 14
                    }}
                  >
                    {exp.variants.map((v) => (
                      <div
                        key={v.label}
                        style={{
                          padding: "16px 18px",
                          borderRadius: 10,
                          border: v.recommended
                            ? "2px solid var(--primary)"
                            : "1px solid var(--border)",
                          background: v.recommended
                            ? "linear-gradient(135deg, #eef2ff, #faf5ff)"
                            : "#fff",
                          position: "relative"
                        }}
                      >
                        {v.recommended && (
                          <span
                            className="pill pill-primary"
                            style={{
                              position: "absolute",
                              top: -8,
                              right: 12,
                              fontSize: 10,
                              fontWeight: 700
                            }}
                          >
                            RECOMMENDED
                          </span>
                        )}
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            marginBottom: 4
                          }}
                        >
                          Variant {v.label}
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            color: "var(--text-2)",
                            marginBottom: 12
                          }}
                        >
                          {v.strategy}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 8,
                            fontSize: 12
                          }}
                        >
                          <MetricCell
                            label="解决率"
                            value={`${(v.resolveRate * 100).toFixed(0)}%`}
                            good={v.resolveRate >= 0.75}
                          />
                          <MetricCell
                            label="误承诺"
                            value={String(v.falsePromise)}
                            good={v.falsePromise === 0}
                          />
                          <MetricCell
                            label="补槽轮次"
                            value={v.slotFill.toFixed(1)}
                            good={v.slotFill <= 2.5}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dimension table */}
                  <table className="table" style={{ marginTop: 14 }}>
                    <thead>
                      <tr>
                        <th>实验维度</th>
                        <th>Variant A</th>
                        <th>Variant B</th>
                        <th>观察指标</th>
                        <th>胜出</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exp.dimensionTable.map((d) => (
                        <tr key={d.dim}>
                          <td style={{ fontWeight: 500 }}>{d.dim}</td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {d.a}
                          </td>
                          <td className="mono" style={{ fontSize: 12 }}>
                            {d.b}
                          </td>
                          <td>{d.metric}</td>
                          <td>
                            <span
                              className={`pill ${
                                d.winner === "B"
                                  ? "pill-success"
                                  : d.winner === "A"
                                  ? "pill-warning"
                                  : "pill-muted"
                              }`}
                            >
                              {d.winner === "=" ? "持平" : d.winner}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Decision card */}
                  <div
                    style={{
                      marginTop: 14,
                      padding: "14px 18px",
                      borderRadius: 10,
                      background:
                        "linear-gradient(135deg, #eef2ff, #e0e7ff)",
                      border: "1px solid var(--primary-100)"
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--primary)",
                        marginBottom: 6
                      }}
                    >
                      产品决策建议
                    </div>
                    <div style={{ fontSize: 13, marginBottom: 4 }}>
                      <strong>推荐：</strong>
                      Variant {exp.decision.recommend}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--text-2)",
                        marginBottom: 4
                      }}
                    >
                      {exp.decision.reason}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                      <strong>后续：</strong>
                      {exp.decision.next}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  good
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color: "var(--text-3)", marginBottom: 2 }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: good ? "var(--success)" : "var(--danger)"
        }}
      >
        {value}
      </div>
    </div>
  );
}
