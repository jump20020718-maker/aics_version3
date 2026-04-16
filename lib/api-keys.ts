// ============================================================
// API Key 存取工具函数（不在 route 文件中，避免 Next.js 路由冲突）
// ============================================================

import { prisma } from "./prisma";

function settingKey(provider: string) {
  return `api_key:${provider}`;
}

interface ApiKeyRecord {
  key: string;
  baseUrl: string;
  enabled: boolean;
  updatedAt: string;
}

/**
 * 从 Setting 表读取某个 provider 的真实 API Key。
 * 优先 DB，若 DB 未配置则 fallback 到环境变量。
 * 供 message/route.ts 调用
 */
export async function getApiKey(
  provider: string
): Promise<{ key: string; baseUrl: string } | null> {
  // 1. 先查 DB
  try {
    const row = await prisma.setting.findUnique({
      where: { key: settingKey(provider) },
    });
    if (row) {
      const record = JSON.parse(row.value) as ApiKeyRecord;
      if (record.enabled && record.key) {
        return { key: record.key, baseUrl: record.baseUrl };
      }
    }
  } catch {
    // DB 读取失败，继续走环境变量
  }

  // 2. fallback 到环境变量
  const envMap: Record<string, string> = {
    openai: process.env.OPENAI_API_KEY ?? "",
    anthropic: process.env.ANTHROPIC_API_KEY ?? "",
    google: process.env.GOOGLE_API_KEY ?? "",
    zhipu: process.env.ZHIPU_API_KEY ?? "",
    siliconflow: process.env.SILICONFLOW_API_KEY ?? "",
    minimax: process.env.MINIMAX_API_KEY ?? "",
    moonshot: process.env.MOONSHOT_API_KEY ?? "",
    deepseek: process.env.DEEPSEEK_API_KEY ?? "",
  };
  const envKey = envMap[provider];
  if (envKey) {
    const { PROVIDER_PRESETS } = await import("./llm/client");
    const preset = PROVIDER_PRESETS[provider];
    return {
      key: envKey,
      baseUrl:
        (provider === "zhipu"
          ? process.env.ZHIPU_BASE_URL
          : provider === "siliconflow"
          ? process.env.SILICONFLOW_BASE_URL
          : undefined) ??
        preset?.defaultBaseUrl ??
        "",
    };
  }

  return null;
}
