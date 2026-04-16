"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Target,
  FlaskConical,
  FileText,
  Search,
  ArrowUpRight,
  MessageSquare,
  Cpu,
  Bug,
  Settings
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { href: "/console", icon: BarChart3, label: "业务总览" },
      { href: "/console/eval", icon: Target, label: "评测结果" }
    ]
  },
  {
    label: "Experiments",
    items: [
      { href: "/console/experiments", icon: FlaskConical, label: "A/B Test" },
      { href: "/console/prompts", icon: FileText, label: "Prompt 版本" },
      { href: "/console/retrieval", icon: Search, label: "检索策略" },
      { href: "/console/handoff-rules", icon: ArrowUpRight, label: "Handoff 阈值" },
      { href: "/console/tone-templates", icon: MessageSquare, label: "情绪话术" }
    ]
  },
  {
    label: "Models",
    items: [
      { href: "/console/models", icon: Cpu, label: "模型路由" }
    ]
  },
  {
    label: "Data",
    items: [
      { href: "/console/badcases", icon: Bug, label: "Badcase 池" }
    ]
  },
  {
    label: "Settings",
    items: [
      { href: "/console/settings", icon: Settings, label: "系统设置" }
    ]
  }
];

export default function ConsoleLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px minmax(0, 1fr)",
        height: "calc(100vh - 52px)"
      }}
    >
      {/* Sidebar */}
      <nav
        style={{
          background: "#fff",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
          padding: "14px 0"
        }}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: 6 }}>
            <div
              style={{
                padding: "6px 18px",
                fontSize: 10.5,
                fontWeight: 600,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}
            >
              {group.label}
            </div>
            {group.items.map((item) => {
              const active =
                item.href === "/console"
                  ? pathname === "/console"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    color: active ? "var(--primary)" : "var(--text-2)",
                    background: active ? "var(--primary-50)" : "transparent",
                    borderRight: active
                      ? "3px solid var(--primary)"
                      : "3px solid transparent",
                    textDecoration: "none",
                    transition: "all 120ms"
                  }}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Main content */}
      <main
        style={{
          overflowY: "auto",
          background: "var(--bg)",
          padding: "22px 28px"
        }}
      >
        {children}
      </main>
    </div>
  );
}
