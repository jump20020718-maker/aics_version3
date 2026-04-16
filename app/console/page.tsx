"use client";

import { useState } from "react";
import { MOCK_KPIS, MOCK_RISK_GATES } from "@/lib/mock-data";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Shield,
  Target,
  Download
} from "lucide-react";

type TimeRange = "24h" | "7d" | "30d" | "90d";

export default function ConsolePage() {
  const [range, setRange] = useState<TimeRange>("7d");

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          业务总览
        </h1>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {(["24h", "7d", "30d", "90d"] as TimeRange[]).map((r) => (
            <button
              key={r}
              className="btn"
              onClick={() => setRange(r)}
              style={{
                background: range === r ? "var(--primary)" : undefined,
                color: range === r ? "#fff" : undefined,
                borderColor: range === r ? "var(--primary)" : undefined,
                fontSize: 12
              }}
            >
              {r}
            </button>
          ))}
          <button className="btn" style={{ marginLeft: 8 }}>
            <Download size={14} />
            导出
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginBottom: 22
        }}
      >
        <KpiCard
          label="自动解决率"
          value={`${(MOCK_KPIS.resolveRate.value * 100).toFixed(1)}%`}
          delta={MOCK_KPIS.resolveRate.delta}
          trend={MOCK_KPIS.resolveRate.trend}
          color="var(--success)"
          icon={<TrendingUp size={18} />}
        />
        <KpiCard
          label="人工接管率"
          value={`${(MOCK_KPIS.handoffRate.value * 100).toFixed(1)}%`}
          delta={MOCK_KPIS.handoffRate.delta}
          trend={MOCK_KPIS.handoffRate.trend}
          color="var(--warning)"
          icon={<ArrowUpRight size={18} />}
          invertDelta
        />
        <KpiCard
          label="风险门槛通过"
          value={String(MOCK_KPIS.gatePass.value)}
          delta={MOCK_KPIS.gatePass.delta}
          trend={MOCK_KPIS.gatePass.trend.map((v) => v / 3)}
          color="var(--primary)"
          icon={<Shield size={18} />}
        />
        <KpiCard
          label="评测通过率"
          value={`${(MOCK_KPIS.evalPassRate.value * 100).toFixed(1)}%`}
          delta={MOCK_KPIS.evalPassRate.delta}
          trend={MOCK_KPIS.evalPassRate.trend}
          color="#8b5cf6"
          icon={<Target size={18} />}
        />
      </div>

      {/* Two columns: Trend Chart + Risk Gates */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14
        }}
      >
        {/* Trend chart */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <h3
            style={{
              margin: "0 0 14px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-1)"
            }}
          >
            趋势 ({range})
          </h3>
          <TrendChart
            resolveData={MOCK_KPIS.resolveRate.trend}
            handoffData={MOCK_KPIS.handoffRate.trend}
          />
          <div
            style={{
              display: "flex",
              gap: 18,
              justifyContent: "center",
              marginTop: 10,
              fontSize: 12,
              color: "var(--text-3)"
            }}
          >
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 3,
                  background: "var(--success)",
                  borderRadius: 2,
                  marginRight: 5
                }}
              />
              解决率
            </span>
            <span>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 3,
                  background: "var(--warning)",
                  borderRadius: 2,
                  marginRight: 5
                }}
              />
              接管率
            </span>
          </div>
        </div>

        {/* Risk Gates */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <h3
            style={{
              margin: "0 0 14px",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-1)"
            }}
          >
            风险门槛
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MOCK_RISK_GATES.map((g) => (
              <div key={g.code}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                    fontSize: 12.5
                  }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {g.code} {g.name}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--text-3)" }}>
                      ≥{(g.threshold * 100).toFixed(0)}%
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {(g.current * 100).toFixed(0)}%
                    </span>
                    <span
                      className={`pill ${
                        g.pass ? "pill-success" : "pill-danger"
                      }`}
                    >
                      {g.pass ? "通过" : "失败"}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: "var(--border-soft)",
                    overflow: "hidden"
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(g.current * 100, 100)}%`,
                      borderRadius: 3,
                      background: g.pass ? "var(--success)" : "var(--danger)",
                      transition: "width 400ms ease"
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function KpiCard({
  label,
  value,
  delta,
  trend,
  color,
  icon,
  invertDelta
}: {
  label: string;
  value: string;
  delta: number;
  trend: number[];
  color: string;
  icon: React.ReactNode;
  invertDelta?: boolean;
}) {
  const isUp = delta > 0;
  const deltaColor = invertDelta
    ? isUp ? "var(--danger)" : "var(--success)"
    : isUp ? "var(--success)" : "var(--danger)";

  return (
    <div className="card" style={{ padding: "16px 18px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ color, opacity: 0.7 }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "var(--text-1)",
          lineHeight: 1.1,
          marginBottom: 8
        }}
      >
        {value}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        {delta !== 0 ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: deltaColor }}>
            {isUp ? "▲" : "▼"}{" "}
            {Math.abs(delta * 100).toFixed(1)}%
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>—</span>
        )}
        <SparkLine data={trend} color={color} />
      </div>
    </div>
  );
}

function SparkLine({ data, color }: { data: number[]; color: string }) {
  const w = 60;
  const h = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendChart({
  resolveData,
  handoffData
}: {
  resolveData: number[];
  handoffData: number[];
}) {
  const w = 360;
  const h = 140;
  const pad = { t: 10, r: 10, b: 20, l: 36 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const allVals = [...resolveData, ...handoffData];
  const min = Math.min(...allVals) - 0.05;
  const max = Math.max(...allVals) + 0.05;
  const range = max - min || 1;

  const toPath = (data: number[]) =>
    data
      .map((v, i) => {
        const x = pad.l + (i / (data.length - 1)) * cw;
        const y = pad.t + ch - ((v - min) / range) * ch;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");

  // Y axis labels
  const yLabels = [min, (min + max) / 2, max].map((v) => ({
    v,
    y: pad.t + ch - ((v - min) / range) * ch,
    label: `${(v * 100).toFixed(0)}%`
  }));

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      {/* Grid lines */}
      {yLabels.map((yl) => (
        <g key={yl.label}>
          <line
            x1={pad.l}
            y1={yl.y}
            x2={w - pad.r}
            y2={yl.y}
            stroke="var(--border-soft)"
            strokeDasharray="3,3"
          />
          <text
            x={pad.l - 4}
            y={yl.y + 3.5}
            textAnchor="end"
            fontSize={9}
            fill="var(--text-3)"
          >
            {yl.label}
          </text>
        </g>
      ))}

      {/* Lines */}
      <path d={toPath(resolveData)} fill="none" stroke="var(--success)" strokeWidth={2} />
      <path d={toPath(handoffData)} fill="none" stroke="var(--warning)" strokeWidth={2} />

      {/* Dots */}
      {resolveData.map((v, i) => {
        const x = pad.l + (i / (resolveData.length - 1)) * cw;
        const y = pad.t + ch - ((v - min) / range) * ch;
        return <circle key={`r${i}`} cx={x} cy={y} r={3} fill="var(--success)" />;
      })}
      {handoffData.map((v, i) => {
        const x = pad.l + (i / (handoffData.length - 1)) * cw;
        const y = pad.t + ch - ((v - min) / range) * ch;
        return <circle key={`h${i}`} cx={x} cy={y} r={3} fill="var(--warning)" />;
      })}
    </svg>
  );
}
