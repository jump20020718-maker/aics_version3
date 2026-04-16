import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/inbox/sessions/:id/interrupt
 * 中断当前正在生成的消息，返回已生成部分。
 * 真实环境：从 Redis / 内存 map 中找到对应 AbortController 并 abort，
 * 同时写 messages.is_interrupted = true 到 DB。
 * Demo 中客户端已通过 AbortController 关闭 SSE 流，此端点负责服务端确认。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  // Demo: 模拟服务端中断确认（真实环境写 DB + abort LLM call）
  return NextResponse.json({
    ok: true,
    sessionId,
    action: "interrupted",
    message: "已中断生成，请输入新问题。"
  });
}
