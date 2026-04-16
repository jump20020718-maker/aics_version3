import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "AiServe · 跨境家电 AI 客服 Demo",
  description:
    "可演示、可解释、可验证的 AI 客服 demo — 多模型路由 + RAG 唯一真相源 + 人机协同 + A/B 实验迭代"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <TopBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
