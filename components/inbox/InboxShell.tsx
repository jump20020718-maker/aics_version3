"use client";

import { useMemo, useState } from "react";
import type { SessionItem } from "@/lib/mock-data";
import { InboxList } from "./InboxList";
import { ChatArea } from "./ChatArea";
import { ContextPanel } from "./ContextPanel";

type Filter = "ai_working" | "waiting_handoff" | "high_risk";

export function InboxShell({
  sessions,
  initialSessionId
}: {
  sessions: SessionItem[];
  initialSessionId: string;
}) {
  const [filter, setFilter] = useState<Filter>("ai_working");
  const [selectedId, setSelectedId] = useState(initialSessionId);
  const [localSessions, setLocalSessions] = useState(sessions);

  const filtered = useMemo(() => {
    if (filter === "ai_working")
      return localSessions.filter((s) => s.status === "active");
    if (filter === "waiting_handoff")
      return localSessions.filter((s) => s.status === "handoff_requested");
    if (filter === "high_risk")
      return localSessions.filter((s) => s.riskSignals.length > 0);
    return localSessions;
  }, [localSessions, filter]);

  const selected =
    localSessions.find((s) => s.id === selectedId) ?? localSessions[0];

  const handleNewMessage = (
    sessionId: string,
    updater: (s: SessionItem) => SessionItem
  ) => {
    setLocalSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? updater(s) : s))
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px minmax(0, 1fr) 380px",
        height: "calc(100vh - 52px)"
      }}
    >
      <InboxList
        sessions={filtered}
        selectedId={selected.id}
        onSelect={setSelectedId}
        filter={filter}
        onFilterChange={setFilter}
      />
      <ChatArea session={selected} onUpdateSession={handleNewMessage} />
      <ContextPanel session={selected} />
    </div>
  );
}
