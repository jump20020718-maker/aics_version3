// ============================================================
// OpenAI-兼容适配器
// 覆盖以下所有 provider（均支持 OpenAI Chat Completions 协议）：
//   openai      → https://api.openai.com/v1
//   zhipu       → https://open.bigmodel.cn/api/paas/v4
//   siliconflow → https://api.siliconflow.cn/v1
//   minimax     → https://api.minimax.chat/v1
//   google      → https://generativelanguage.googleapis.com/v1beta/openai/
//   moonshot    → https://api.moonshot.cn/v1
//   deepseek    → https://api.deepseek.com/v1
//   custom      → 用户自定义 baseUrl
// ============================================================

import OpenAI from "openai";
import type { LLMStreamOptions, LLMChunk } from "../types";

export async function* streamOpenAICompat(
  opts: LLMStreamOptions
): AsyncGenerator<LLMChunk> {
  const client = new OpenAI({
    apiKey: opts.apiKey,
    baseURL: opts.baseUrl || undefined,
    timeout: 60_000,
    maxRetries: 1,
    dangerouslyAllowBrowser: false,
  });

  try {
    const stream = await client.chat.completions.create(
      {
        model: opts.modelId,
        messages: opts.messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 2048,
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: opts.signal }
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        yield { type: "delta", delta };
      }
      // 最后一帧携带 usage
      if (chunk.usage) {
        yield {
          type: "done",
          usage: {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
          },
        };
      } else if (chunk.choices[0]?.finish_reason) {
        yield { type: "done" };
      }
    }
  } catch (err: unknown) {
    const msg =
      err instanceof OpenAI.APIError
        ? `[${err.status}] ${err.message}`
        : err instanceof Error
        ? err.message
        : String(err);
    yield { type: "error", error: msg };
  }
}
