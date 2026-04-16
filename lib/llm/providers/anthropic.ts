// ============================================================
// Anthropic / Claude 专用适配器
// 使用 @anthropic-ai/sdk，与 OpenAI 协议差异较大：
//   - system 消息单独传参，不放在 messages 数组内
//   - streaming 事件结构不同
//   - 不支持 baseUrl 覆盖（通常走官方端点）
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import type { LLMStreamOptions, LLMChunk } from "../types";

export async function* streamAnthropic(
  opts: LLMStreamOptions
): AsyncGenerator<LLMChunk> {
  const client = new Anthropic({
    apiKey: opts.apiKey,
    // 允许自定义代理端点（如企业内网转发）
    baseURL: opts.baseUrl || undefined,
    timeout: 60_000,
    maxRetries: 1,
  });

  // Anthropic 的 system 消息需单独传，从 messages 数组中分离
  const systemContent =
    opts.messages.find((m) => m.role === "system")?.content ?? "";
  const conversation = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Anthropic 要求至少一条 user 消息
  if (conversation.length === 0) {
    yield { type: "error", error: "Anthropic 需要至少一条 user 消息" };
    return;
  }

  try {
    const stream = client.messages.stream({
      model: opts.modelId,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.3,
      system: systemContent || undefined,
      messages: conversation,
    });

    // 监听中断信号
    opts.signal?.addEventListener("abort", () => stream.abort());

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { type: "delta", delta: event.delta.text };
      } else if (event.type === "message_delta" && event.usage) {
        yield {
          type: "done",
          usage: {
            promptTokens: 0, // Anthropic 不在 delta 里返回 input tokens
            completionTokens: event.usage.output_tokens,
          },
        };
      } else if (event.type === "message_stop") {
        yield { type: "done" };
      }
    }
  } catch (err: unknown) {
    const msg =
      err instanceof Anthropic.APIError
        ? `[${err.status}] ${err.message}`
        : err instanceof Error
        ? err.message
        : String(err);
    yield { type: "error", error: msg };
  }
}
