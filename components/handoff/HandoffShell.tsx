"use client";

import { useMemo, useState } from "react";
import type { HandoffCaseItem } from "@/lib/mock-data";
import { HandoffQueue } from "./HandoffQueue";
import { CaseDetail } from "./CaseDetail";
import { ActionPanel } from "./ActionPanel";

type Filter = "all" | "L2" | "L3" | "sla_soon";

export function HandoffShell({ cases }: { cases: HandoffCaseItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState(cases[0]?.id ?? "");

  const filtered = useMemo(() => {
    if (filter === "all") return cases;
    if (filter === "sla_soon")
      return cases.filter(
        (h) => new Date(h.slaDeadline).getTime() - Date.now() < 15 * 60_000
      );
    return cases.filter((h) => `L${h.level}` === filter);
  }, [cases, filter]);

  const selected = cases.find((c) => c.id === selectedId) ?? cases[0];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px minmax(0, 1fr) 360px",
        height: "calc(100vh - 52px)"
      }}
    >
      <HandoffQueue
        cases={filtered}
        selectedId={selected?.id ?? ""}
        onSelect={setSelectedId}
        filter={filter}
        onFilterChange={setFilter}
      />
      {selected ? (
        <>
          <CaseDetail caseItem={selected} />
          <ActionPanel caseItem={selected} />
        </>
      ) : (
        <div
          style={{
            gridColumn: "2 / -1",
            display: "grid",
            placeItems: "center",
            color: "var(--text-3)"
          }}
        >
          暂无待处理工单
        </div>
      )}
    </div>
  );
}
