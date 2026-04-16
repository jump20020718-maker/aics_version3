"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Bell, Settings } from "lucide-react";

const TABS = [
  { href: "/inbox", label: "Inbox", status: "online" as const },
  { href: "/handoff", label: "Handoff" },
  { href: "/console", label: "Console" },
  { href: "/knowledge", label: "Knowledge" }
];

export function TopBar() {
  const pathname = usePathname() || "";
  return (
    <header className="topbar" style={styles.topbar}>
      <Link href="/inbox" className="brand" style={styles.brand}>
        <div style={styles.brandMark}>A</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>AiServe</div>
        <div style={styles.brandSub}>跨境家电 AI 客服</div>
      </Link>

      <nav style={styles.navTabs}>
        {TABS.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                ...styles.navTab,
                ...(active ? styles.navTabActive : {})
              }}
            >
              {tab.status === "online" && (
                <span
                  className="dot dot-success"
                  aria-label="online"
                  style={{ marginRight: 2 }}
                />
              )}
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div style={styles.topRight}>
        <div style={styles.search}>
          <Search size={14} />
          <span>搜索会话、订单、文档…</span>
          <kbd style={styles.kbd}>⌘K</kbd>
        </div>
        <button style={styles.iconBtn} aria-label="通知">
          <Bell size={16} />
        </button>
        <Link
          href="/console/settings"
          style={styles.iconBtn}
          aria-label="设置"
        >
          <Settings size={16} />
        </Link>
        <div style={styles.avatar}>PM</div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  topbar: {
    height: 52,
    background: "#ffffff",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: 24,
    position: "sticky",
    top: 0,
    zIndex: 20
  },
  brand: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 700,
    fontSize: 14
  },
  brandSub: {
    color: "var(--text-3)",
    fontSize: 12,
    paddingLeft: 10,
    borderLeft: "1px solid var(--border)"
  },
  navTabs: { display: "flex", gap: 2, marginLeft: 12 },
  navTab: {
    padding: "7px 12px",
    borderRadius: 7,
    color: "var(--text-2)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    textDecoration: "none"
  },
  navTabActive: { background: "var(--primary-50)", color: "var(--primary)" },
  topRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    width: 260,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text-3)",
    fontSize: 12.5
  },
  kbd: {
    marginLeft: "auto",
    fontFamily: "JetBrains Mono, monospace",
    fontSize: 11,
    padding: "1px 5px",
    border: "1px solid var(--border)",
    borderRadius: 4,
    background: "#fff",
    color: "var(--text-3)"
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: "var(--text-2)",
    cursor: "pointer",
    border: "none",
    background: "transparent"
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontWeight: 600,
    fontSize: 11.5
  }
};
