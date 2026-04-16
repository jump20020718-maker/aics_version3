"use client";

import { MOCK_KPIS, MOCK_RISK_GATES } from "@/lib/mock-data";
import { Target, CheckCircle, XCircle, Info } from "lucide-react";

export default function EvalPage() {
  const passCount = MOCK_RISK_GATES.filter((g) => g.pass).length;
  const totalCount = MOCK_RISK_GATES.length;

  return (
    <div>
      <h1 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700 }}>
        <Target
          size={20}
          style={{ verticalAlign: "text-bottom", marginRight: 6 }}
        />
        评测结果
      </h1>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
          marginBottom: 24
        }}
      >
        <SummaryCard
          label="评测通过率"
          value={`${(MOCK_KPIS.evalPassRate.value * 100).toFixed(1)}%`}
          sub={`较上周 ${MOCK_KPIS.evalPassRate.delta > 0 ? "+" : ""}${(MOCK_KPIS.evalPassRate.delta * 100).toFixed(1)}%`}
          color={MOCK_KPIS.evalPassRate.value >= 0.8 ? "var(--success)" : "var(--danger)"}
        />
        <SummaryCard
          label="风险门槛通过"
          value={`${passCount} / ${totalCount}`}
          sub={passCount === totalCount ? "全部通过" : `${totalCount - passCount} 项未达标`}
          color={passCount === totalCount ? "var(--success)" : "var(--danger)"}
        />
        <SummaryCard
          label="自动解决率"
          value={`${(MOCK_KPIS.resolveRate.value * 100).toFixed(1)}%`}
          sub={`较上周 ${MOCK_KPIS.resolveRate.delta > 0 ? "+" : ""}${(MOCK_KPIS.resolveRate.delta * 100).toFixed(1)}%`}
          color="var(--primary)"
        />
      </div>

      {/* Risk gates detail */}
      <div className="card" style={{ padding: "18px 22px" }}>
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-1)"
          }}
        >
          风险门槛逐项评测
        </h3>
        <table className="table">
          <thead>
            <tr>
              <th>场景</th>
              <th>名称</th>
              <th>阈值</th>
              <th>当前值</th>
              <th>达标</th>
              <th>差距</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_RISK_GATES.map((g) => {
              const gap = g.current - g.threshold;
              return (
                <tr key={g.code}>
                  <td>
                    <span className="pill pill-muted" style={{ fontSize: 11, fontWeight: 600 }}>
                      {g.code}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{g.name}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    ≥ {(g.threshold * 100).toFixed(0)}%
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          background: "var(--border)",
                          overflow: "hidden",
                          minWidth: 80
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(g.current * 100, 100)}%`,
                            height: "100%",
                            background: g.pass ? "var(--success)" : "var(--danger)",
                            borderRadius: 3,
                            transition: "width 400ms ease"
                          }}
                        />
                      </div>
                      <span
                        className="mono"
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: g.pass ? "var(--success)" : "var(--danger)"
                        }}
                      >
                        {(g.current * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {g.pass ? (
                      <CheckCircle size={16} style={{ color: "var(--success)" }} />
                    ) : (
                      <XCircle size={16} style={{ color: "var(--danger)" }} />
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color:
                          gap >= 0
                            ? "var(--success)"
                            : "var(--danger)"
                      }}
                    >
                      {gap >= 0 ? "+" : ""}{(gap * 100).toFixed(0)}pp
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Eval data source info */}
      <div
        style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 8,
          background: "linear-gradient(135deg, #eef2ff, #faf5ff)",
          border: "1px solid var(--primary-100)",
          fontSize: 12.5,
          color: "var(--text-2)",
          display: "flex",
          alignItems: "flex-start",
          gap: 8
        }}
      >
        <Info size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--primary)" }} />
        <div>
          <strong style={{ color: "var(--primary)" }}>评测数据源：</strong>
          eval_batch1_v2_expanded.csv（130 条基础用例）+
          eval_multiturn_supplement_v1.csv（37 条多轮补充）。
          评分细则见 eval_rubric_guide.md。
          场景覆盖 B1–B12 共 12 个业务场景，每条用例按 correctness / safety / citation / tone 四维度打分。
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "18px 20px",
        borderTop: `3px solid ${color}`
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color }}>{sub}</div>
    </div>
  );
}
