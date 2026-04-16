// ============================================================
// prisma/seed.ts — 主流大模型初始数据
// 运行：npm run db:seed
//
// 覆盖：OpenAI / Anthropic / Google / 智谱 / 硅基 / MiniMax / Moonshot / DeepSeek
// 每个 provider 各选 1-2 个代表模型
// ============================================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MODELS = [
  // ── OpenAI ─────────────────────────────────────────────────
  {
    name: "GPT-4o",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelId: "gpt-4o",
    contextWindow: 128000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["通用", "多模态", "工具调用"]),
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "GPT-4o-mini",
    provider: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    modelId: "gpt-4o-mini",
    contextWindow: 128000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["通用", "低成本"]),
    costPer1kInput: 0.0003,
    costPer1kOutput: 0.0006,
    defaultTemp: 0.3,
    timeoutMs: 30000,
    maxRetries: 2,
    enabled: true,
  },

  // ── Anthropic / Claude ─────────────────────────────────────
  {
    name: "Claude Opus 4.6",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    modelId: "claude-opus-4-6",
    contextWindow: 200000,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsTools: true,
    capabilityTags: JSON.stringify(["旗舰", "推理", "工具调用"]),
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    defaultTemp: 0.3,
    timeoutMs: 120000,
    maxRetries: 1,
    enabled: true,
  },
  {
    name: "Claude Sonnet 4.6",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    modelId: "claude-sonnet-4-6",
    contextWindow: 200000,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsTools: true,
    capabilityTags: JSON.stringify(["均衡", "推理", "工具调用"]),
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "Claude Haiku 4.5",
    provider: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKeyEnv: "ANTHROPIC_API_KEY",
    modelId: "claude-haiku-4-5-20251001",
    contextWindow: 200000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["快速", "低成本"]),
    costPer1kInput: 0.0008,
    costPer1kOutput: 0.004,
    defaultTemp: 0.3,
    timeoutMs: 30000,
    maxRetries: 2,
    enabled: true,
  },

  // ── Google Gemini ──────────────────────────────────────────
  {
    name: "Gemini 2.0 Flash",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GOOGLE_API_KEY",
    modelId: "gemini-2.0-flash",
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["超长上下文", "多模态", "低延迟"]),
    costPer1kInput: 0.0001,
    costPer1kOutput: 0.0004,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "Gemini 1.5 Pro",
    provider: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    apiKeyEnv: "GOOGLE_API_KEY",
    modelId: "gemini-1.5-pro",
    contextWindow: 2000000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["超长上下文", "多模态"]),
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    defaultTemp: 0.3,
    timeoutMs: 120000,
    maxRetries: 2,
    enabled: true,
  },

  // ── 智谱 AI (GLM) ──────────────────────────────────────────
  {
    name: "GLM-4-Plus",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    modelId: "glm-4-plus",
    contextWindow: 128000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["通用", "中文优化", "工具调用"]),
    costPer1kInput: 0.05,
    costPer1kOutput: 0.05,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "GLM-4-Flash（免费）",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    modelId: "glm-4-flash",
    contextWindow: 128000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["免费", "快速", "中文"]),
    costPer1kInput: 0,
    costPer1kOutput: 0,
    defaultTemp: 0.3,
    timeoutMs: 30000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "GLM-Z1-Flash（推理免费）",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    modelId: "glm-z1-flash",
    contextWindow: 128000,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsTools: false,
    capabilityTags: JSON.stringify(["免费", "推理", "中文"]),
    costPer1kInput: 0,
    costPer1kOutput: 0,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },

  // ── 硅基流动 (SiliconFlow) ─────────────────────────────────
  {
    name: "DeepSeek-V3（硅基）",
    provider: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    modelId: "deepseek-ai/DeepSeek-V3",
    contextWindow: 64000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["通用", "中文优化"]),
    costPer1kInput: 0.002,
    costPer1kOutput: 0.008,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "Qwen2.5-72B（硅基）",
    provider: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    modelId: "Qwen/Qwen2.5-72B-Instruct",
    contextWindow: 131072,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["通用", "中文优化", "开源"]),
    costPer1kInput: 0.004,
    costPer1kOutput: 0.004,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },

  // ── MiniMax ────────────────────────────────────────────────
  {
    name: "MiniMax-Text-01",
    provider: "minimax",
    baseUrl: "https://api.minimax.chat/v1",
    apiKeyEnv: "MINIMAX_API_KEY",
    modelId: "MiniMax-Text-01",
    contextWindow: 1000000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["超长上下文", "中文", "多模态"]),
    costPer1kInput: 0.001,
    costPer1kOutput: 0.008,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },

  // ── Moonshot (Kimi) ────────────────────────────────────────
  {
    name: "Moonshot-v1-32k",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: "MOONSHOT_API_KEY",
    modelId: "moonshot-v1-32k",
    contextWindow: 32000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["中文优化", "长文本"]),
    costPer1kInput: 0.024,
    costPer1kOutput: 0.024,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "Moonshot-v1-128k",
    provider: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: "MOONSHOT_API_KEY",
    modelId: "moonshot-v1-128k",
    contextWindow: 128000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["超长上下文", "中文"]),
    costPer1kInput: 0.06,
    costPer1kOutput: 0.06,
    defaultTemp: 0.3,
    timeoutMs: 120000,
    maxRetries: 2,
    enabled: true,
  },

  // ── DeepSeek ───────────────────────────────────────────────
  {
    name: "DeepSeek-Chat",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelId: "deepseek-chat",
    contextWindow: 64000,
    supportsStreaming: true,
    supportsReasoning: false,
    supportsTools: true,
    capabilityTags: JSON.stringify(["通用", "低成本", "中文"]),
    costPer1kInput: 0.0014,
    costPer1kOutput: 0.0028,
    defaultTemp: 0.3,
    timeoutMs: 60000,
    maxRetries: 2,
    enabled: true,
  },
  {
    name: "DeepSeek-Reasoner",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    modelId: "deepseek-reasoner",
    contextWindow: 64000,
    supportsStreaming: true,
    supportsReasoning: true,
    supportsTools: false,
    capabilityTags: JSON.stringify(["推理", "中文"]),
    costPer1kInput: 0.0055,
    costPer1kOutput: 0.0219,
    defaultTemp: 0.3,
    timeoutMs: 120000,
    maxRetries: 1,
    enabled: true,
  },
];

// 默认路由方案（使用 GLM-4-Flash，免费可测试）
async function seedRoutePlan(glmFlashId: string) {
  await prisma.routePlan.upsert({
    where: { name: "默认路由方案 v1" },
    create: {
      name: "默认路由方案 v1",
      description: "默认使用 GLM-4-Flash（免费），可在模型路由页切换",
      isActive: true,
      rules: JSON.stringify([]),
      fallbackModelId: glmFlashId,
      version: "v1",
      createdBy: "seed",
    },
    update: {
      fallbackModelId: glmFlashId,
      isActive: true,
    },
  });
}

async function main() {
  console.log("开始写入模型数据...");

  let glmFlashId = "";

  for (const m of MODELS) {
    const result = await prisma.model.upsert({
      where: { name: m.name },
      create: m,
      update: m,
    });
    console.log(`  ✓ ${m.name} (${m.provider})`);
    if (m.modelId === "glm-4-flash") {
      glmFlashId = result.id;
    }
  }

  if (glmFlashId) {
    await seedRoutePlan(glmFlashId);
    console.log("  ✓ 默认路由方案（GLM-4-Flash）");
  }

  console.log(`\n共写入 ${MODELS.length} 个模型配置。`);
  console.log("接下来请在「系统设置 → API Keys」中配置您的 API Key。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
