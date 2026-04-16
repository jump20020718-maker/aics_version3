export function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} 小时前`;
  return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function formatSla(deadline: string) {
  const ms = new Date(deadline).getTime() - Date.now();
  if (ms <= 0) return { label: "已超时", critical: true };
  const min = Math.round(ms / 60_000);
  if (min < 60) return { label: `${min} 分钟`, critical: min < 15 };
  const h = Math.round(min / 60);
  return { label: `${h} 小时`, critical: false };
}

export function formatCny(n: number) {
  return `¥${n.toLocaleString("zh-CN")}`;
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
