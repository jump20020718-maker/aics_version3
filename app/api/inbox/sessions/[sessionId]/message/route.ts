// ============================================================
// POST /api/inbox/sessions/:sessionId/message
//
// 真实 LLM 调用链：
//   1. 从 DB 读取激活模型配置（RoutePlan → Model）
//   2. 从 Setting 表读取对应 provider 的 API Key
//   3. 简单 RAG：关键词检索 RagDoc 表，构建上下文
//   4. 调用 LLM（SSE 流式输出）
//   5. 写 Message 记录到 DB（用户消息 + AI 回复）
//   6. 无 API Key 时自动降级到 mock 模式，给出明确提示
// ============================================================

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { streamLLM } from "@/lib/llm/client";
import { getApiKey } from "@/app/api/settings/api-keys/route";
import { getActiveModel } from "@/app/api/models/route";
import type { LLMMessage } from "@/lib/llm/types";

// ── RAG 关键词检索 ──────────────────────────────────────────

async function retrieveRagDocs(query: string, topK = 4) {
  try {
    // 提取有意义的关键词（过滤短词和常见停用词）
    const stopwords = new Set([
      "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
      "都", "一", "一个", "上", "也", "很", "到", "说", "要", "去",
      "你", "会", "着", "没有", "看", "好", "自己", "这", "那",
    ]);
    const keywords = query
      .replace(/[，。？！、；：""''【】（）《》\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !stopwords.has(w))
      .slice(0, 6);

    if (keywords.length === 0) return [];

    // 对每个关键词做 LIKE 查询，合并去重
    const results = await prisma.ragDoc.findMany({
      where: {
        OR: keywords.flatMap((kw) => [
          { title: { contains: kw } },
          { content: { contains: kw } },
        ]),
        sourceOfTruthTier: { lte: 2 }, // 只用 Tier1/2 高可信文档
      },
      orderBy: { sourceOfTruthTier: "asc" },
      take: topK,
      select: {
        docId: true,
        title: true,
        content: true,
        sourceOfTruthTier: true,
        confidenceCeiling: true,
        domain: true,
        docType: true,
      },
    });

    return results;
  } catch {
    return [];
  }
}

// ── System Prompt 构建 ──────────────────────────────────────

async function buildSystemPrompt(ragDocs: Awaited<ReturnType<typeof retrieveRagDocs>>) {
  // 优先读 DB 中的 active system_main prompt
  let basePrompt: string | null = null;
  try {
    const pv = await prisma.promptVersion.findFirst({
      where: { slot: "system_main", isActive: true },
      orderBy: { createdAt: "desc" },
    });
    basePrompt = pv?.content ?? null;
  } catch {
    // DB 读取失败，使用内置默认
  }

  if (!basePrompt) {
    basePrompt = `你是一位专业的跨境进口家电 AI 客服助手。

工作原则：
1. 优先基于知识库中的官方文档回答，确保业务事实准确可追溯
2. 保修、退换规则、兼容性、配送承诺等关键业务问题，必须引用知识库文档，不得凭空回答
3. 语气专业、耐心，遇到情绪化客户先共情再解决问题
4. 如果知识库中找不到答案，明确说明并建议转人工，不要编造信息
5. 默认用中文回复

当前系统：AI 客服工作台，服务跨境进口家电（欧美日韩品牌）客户咨询。`;
  }

  if (ragDocs.length === 0) return basePrompt;

  const ragSection = ragDocs
    .map(
      (doc, i) =>
        `[知识库文档 ${i + 1}] ${doc.title}（Tier${doc.sourceOfTruthTier}）\n${doc.content.slice(0, 600)}`
    )
    .join("\n\n---\n\n");

  return `${basePrompt}\n\n## 本次检索到的相关知识库文档\n\n${ragSection}\n\n请根据以上文档内容回答用户问题，回答时可以直接引用文档中的具体规定。`;
}

// ── 历史消息读取 ────────────────────────────────────────────

async function loadHistory(sessionId: string): Promise<LLMMessage[]> {
  try {
    const msgs = await prisma.message.findMany({
      where: {
        sessionId,
        role: { in: ["user", "assistant"] },
      },
      orderBy: { createdAt: "asc" },
      take: 20, // 最多携带 20 条历史
    });
    return msgs.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
  } catch {
    return [];
  }
}

// ── 消息入库（写失败不影响响应流程）────────────────────────

async function saveMessage(params: {
  sessionId: string;
  role: string;
  content: string;
  modelId?: string;
  latencyMs?: number;
  citations?: string;
  reasoning?: string;
}) {
  try {
    // 如果 session 不存在，先创建占位 session
    const session = await prisma.session.findUnique({
      where: { id: params.sessionId },
    });
    if (!session) {
      // 自动创建占位 customer + session（确保 FK 不报错）
      const custId = `auto_${params.sessionId.slice(0, 8)}`;
      await prisma.customer.upsert({
        where: { customerId: custId },
        create: { customerId: custId, name: "自动创建顾客", channel: "web" },
        update: {},
      });
      await prisma.session.create({
        data: {
          id: params.sessionId,
          customerId: custId,
          channel: "web",
          status: "active",
        },
      });
    }

    await prisma.message.create({
      data: {
        sessionId: params.sessionId,
        role: params.role,
        content: params.content,
        modelId: params.modelId,
        latencyMs: params.latencyMs,
        citations: params.citations,
        reasoning: params.reasoning,
      },
    });

    // 更新 session.lastActiveAt
    await prisma.session.update({
      where: { id: params.sessionId },
      data: { lastActiveAt: new Date() },
    });
  } catch (e) {
    // 写库失败不影响前端响应
    console.error("[saveMessage] 入库失败:", e);
  }
}

// ── Mock 降级（无 API Key 时使用）──────────────────────────

function mockStream(userContent: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const sleep = (ms: number) =>
        new Promise((r) => setTimeout(r, ms));

      emit("reasoning", {
        icon: "⚠️",
        label: "未配置 API Key",
        detail: "请前往「系统设置」配置真实 API Key 后重试",
      });

      await sleep(300);

      const mockText =
        `【演示模式】当前未配置任何大模型 API Key，无法调用真实模型。\n\n` +
        `您的问题是：「${userContent.slice(0, 80)}」\n\n` +
        `请前往 **Console → 系统设置 → API Keys** 配置您的模型密钥，支持：\n` +
        `- OpenAI (GPT-4o 等)\n` +
        `- Anthropic (Claude 系列)\n` +
        `- Google Gemini\n` +
        `- 智谱 AI (GLM)\n` +
        `- 硅基流动 / MiniMax / Moonshot / DeepSeek`;

      for (const char of mockText) {
        emit("token", { delta: char });
        await sleep(12);
      }

      emit("done", {
        messageId: `mock_${Date.now()}`,
        latencyMs: 0,
        model: "mock",
        isMock: true,
      });

      controller.close();
    },
  });
}

// ── 主 Handler ──────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  const body = await req.json();
  const userContent: string = body.content ?? "";

  if (!userContent.trim()) {
    return new Response("消息内容不能为空", { status: 400 });
  }

  const encoder = new TextEncoder();
  const startTime = Date.now();

  // ── 1. 读取模型配置 ────────────────────────────────────────
  const model = await getActiveModel();
  if (!model) {
    // 无模型配置 → mock 降级
    return new Response(mockStream(userContent), {
      headers: sseHeaders(),
    });
  }

  // ── 2. 读取 API Key ────────────────────────────────────────
  const keyRecord = await getApiKey(model.provider);
  if (!keyRecord) {
    return new Response(mockStream(userContent), {
      headers: sseHeaders(),
    });
  }

  // ── 3. 保存用户消息 ────────────────────────────────────────
  await saveMessage({ sessionId, role: "user", content: userContent });

  // ── 4. RAG 检索 ────────────────────────────────────────────
  const ragDocs = await retrieveRagDocs(userContent);
  const systemPrompt = await buildSystemPrompt(ragDocs);

  // ── 5. 组装历史消息 ────────────────────────────────────────
  const history = await loadHistory(sessionId);
  // 移除刚刚存入的 user 消息（已在 history 里了），避免重复
  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];
  // 如果历史里最后一条不是当前用户消息，追加
  const lastMsg = messages[messages.length - 1];
  if (lastMsg?.role !== "user" || lastMsg.content !== userContent) {
    messages.push({ role: "user", content: userContent });
  }

  // ── 6. 构建 SSE 流 ─────────────────────────────────────────
  const citations = ragDocs.map((doc) => ({
    docId: doc.docId,
    tier: doc.sourceOfTruthTier,
    simScore: doc.confidenceCeiling,
    title: doc.title,
    snippet: doc.content.slice(0, 120),
  }));

  const reasoningSteps = [
    { icon: "🎯", label: "意图识别", detail: "分析用户咨询意图" },
    {
      icon: "🔍",
      label: "知识库检索",
      detail:
        ragDocs.length > 0
          ? `命中 ${ragDocs.length} 篇文档`
          : "未命中相关文档，基于通用知识回答",
    },
    {
      icon: "✍",
      label: "生成回复",
      detail: `model=${model.modelId} provider=${model.provider}`,
    },
  ];

  let fullReply = "";

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
          )
        );
      };

      const sleep = (ms: number) =>
        new Promise((r) => setTimeout(r, ms));

      try {
        // reasoning steps
        for (const step of reasoningSteps) {
          await sleep(200);
          emit("reasoning", step);
        }

        // LLM streaming
        for await (const chunk of streamLLM({
          provider: model.provider,
          baseUrl: keyRecord.baseUrl,
          apiKey: keyRecord.key,
          modelId: model.modelId,
          messages,
          temperature: model.defaultTemp,
          maxTokens: 2048,
        })) {
          if (chunk.type === "delta" && chunk.delta) {
            fullReply += chunk.delta;
            emit("token", { delta: chunk.delta });
          } else if (chunk.type === "error") {
            emit("error", { code: "LLM_ERROR", message: chunk.error });
            controller.close();
            return;
          }
        }

        // citations
        for (const c of citations) {
          emit("citation", c);
        }

        const latencyMs = Date.now() - startTime;

        emit("done", {
          messageId: `m_a_${Date.now()}`,
          latencyMs,
          model: model.modelId,
          provider: model.provider,
          ragHits: ragDocs.length,
        });

        // 7. AI 回复入库
        await saveMessage({
          sessionId,
          role: "assistant",
          content: fullReply,
          modelId: model.modelId,
          latencyMs,
          citations: JSON.stringify(citations),
          reasoning: JSON.stringify(reasoningSteps),
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "internal error";
        emit("error", { code: "STREAM_ERROR", message });
      }

      controller.close();
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };
}
