// ============================================================
// LLM 统一客户端
//
// 职责：
//   1. 维护 provider 预设表（名称、默认 baseUrl、常见模型列表）
//   2. 根据 provider 字段分发到对应适配器
//   3. 导出 streamLLM() 供 API 路由调用
// ============================================================

import type { LLMStreamOptions, LLMChunk, ProviderPreset } from "./types";
import { streamOpenAICompat } from "./providers/openai-compat";
import { streamAnthropic } from "./providers/anthropic";

// ── Provider 预设表 ──────────────────────────────────────────
// 前端展示、API Key 管理、Model 表默认填充都依赖此表
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  openai: {
    name: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    sdk: "openai-compat",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    docsUrl: "https://platform.openai.com/docs",
  },
  anthropic: {
    name: "Anthropic (Claude)",
    defaultBaseUrl: "https://api.anthropic.com",
    sdk: "anthropic",
    models: [
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5-20251001",
      "claude-3-5-sonnet-20241022",
    ],
    docsUrl: "https://docs.anthropic.com",
  },
  google: {
    name: "Google Gemini",
    // Gemini 官方提供的 OpenAI 兼容端点
    defaultBaseUrl:
      "https://generativelanguage.googleapis.com/v1beta/openai/",
    sdk: "openai-compat",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ],
    docsUrl: "https://ai.google.dev/gemini-api/docs",
  },
  zhipu: {
    name: "智谱 AI (GLM)",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    sdk: "openai-compat",
    models: [
      "glm-4-plus",
      "glm-4-air",
      "glm-4-flash",
      "glm-z1-flash",
      "glm-4-long",
    ],
    docsUrl: "https://bigmodel.cn/dev/howuse/model",
  },
  siliconflow: {
    name: "硅基流动 (SiliconFlow)",
    defaultBaseUrl: "https://api.siliconflow.cn/v1",
    sdk: "openai-compat",
    models: [
      "Qwen/Qwen3-235B-A22B",
      "Qwen/Qwen2.5-72B-Instruct",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-R1",
      "THUDM/glm-4-9b-chat",
    ],
    docsUrl: "https://docs.siliconflow.cn",
  },
  minimax: {
    name: "MiniMax",
    defaultBaseUrl: "https://api.minimax.chat/v1",
    sdk: "openai-compat",
    models: ["MiniMax-Text-01", "abab6.5s-chat", "abab5.5-chat"],
    docsUrl: "https://platform.minimaxi.com/document/guides/chat-model",
  },
  moonshot: {
    name: "Moonshot (Kimi)",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    sdk: "openai-compat",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    docsUrl: "https://platform.moonshot.cn/docs",
  },
  deepseek: {
    name: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    sdk: "openai-compat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    docsUrl: "https://platform.deepseek.com/api-docs",
  },
  custom: {
    name: "自定义（OpenAI 兼容）",
    defaultBaseUrl: "",
    sdk: "openai-compat",
    models: [],
  },
};

// ── 主入口 ────────────────────────────────────────────────────

/**
 * 统一流式调用入口。
 * 根据 opts.provider 自动选择适配器，调用方只需处理 LLMChunk 事件。
 */
export async function* streamLLM(
  opts: LLMStreamOptions
): AsyncGenerator<LLMChunk> {
  const preset = PROVIDER_PRESETS[opts.provider];

  // 用 preset 补全 baseUrl（若调用方没传）
  const effectiveOpts: LLMStreamOptions = {
    ...opts,
    baseUrl: opts.baseUrl || preset?.defaultBaseUrl || "",
  };

  if (!effectiveOpts.apiKey) {
    yield {
      type: "error",
      error: `provider "${opts.provider}" 未配置 API Key，请在系统设置中填写`,
    };
    return;
  }

  if (preset?.sdk === "anthropic") {
    yield* streamAnthropic(effectiveOpts);
  } else {
    // 默认走 OpenAI-兼容适配器
    yield* streamOpenAICompat(effectiveOpts);
  }
}

// ── 工具函数 ──────────────────────────────────────────────────

/** 根据 provider key 获取预设；未知 provider 返回 custom 预设 */
export function getPreset(provider: string): ProviderPreset {
  return PROVIDER_PRESETS[provider] ?? PROVIDER_PRESETS.custom;
}

/** 获取所有 provider key 列表（供前端下拉） */
export function listProviders(): string[] {
  return Object.keys(PROVIDER_PRESETS);
}
