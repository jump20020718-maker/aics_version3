// ============================================================
// GET  /api/settings/api-keys
//   返回所有 provider 的 API Key 配置（key 做脱敏处理）
//
// PUT  /api/settings/api-keys
//   保存/更新单个 provider 的 API Key
//   body: { provider: string; apiKey: string; baseUrl?: string }
//
// DELETE /api/settings/api-keys?provider=xxx
//   清除某个 provider 的 API Key
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROVIDER_PRESETS, listProviders } from "@/lib/llm/client";

// Setting 表中存储的 API Key 值结构
interface ApiKeyRecord {
  key: string;
  baseUrl: string;
  enabled: boolean;
  updatedAt: string;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 6) + "****" + key.slice(-4);
}

function settingKey(provider: string) {
  return `api_key:${provider}`;
}

// ── GET ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const providers = listProviders();
    const keys = await prisma.setting.findMany({
      where: { key: { in: providers.map(settingKey) } },
    });

    const keyMap: Record<string, ApiKeyRecord> = {};
    for (const row of keys) {
      try {
        keyMap[row.key] = JSON.parse(row.value) as ApiKeyRecord;
      } catch {
        // 忽略格式错误的记录
      }
    }

    const result = providers.map((provider) => {
      const preset = PROVIDER_PRESETS[provider];
      const record = keyMap[settingKey(provider)];
      return {
        provider,
        name: preset?.name ?? provider,
        sdk: preset?.sdk ?? "openai-compat",
        defaultBaseUrl: preset?.defaultBaseUrl ?? "",
        models: preset?.models ?? [],
        docsUrl: preset?.docsUrl,
        // 脱敏展示
        maskedKey: record?.key ? maskKey(record.key) : null,
        baseUrl: record?.baseUrl ?? preset?.defaultBaseUrl ?? "",
        enabled: record?.enabled ?? false,
        updatedAt: record?.updatedAt ?? null,
      };
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    console.error("[api-keys GET]", err);
    return NextResponse.json(
      { ok: false, error: "读取失败" },
      { status: 500 }
    );
  }
}

// ── PUT ───────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, baseUrl } = body as {
      provider: string;
      apiKey: string;
      baseUrl?: string;
    };

    if (!provider || !apiKey) {
      return NextResponse.json(
        { ok: false, error: "provider 和 apiKey 不能为空" },
        { status: 400 }
      );
    }

    const preset = PROVIDER_PRESETS[provider];
    if (!preset && provider !== "custom") {
      return NextResponse.json(
        { ok: false, error: `未知 provider: ${provider}` },
        { status: 400 }
      );
    }

    const record: ApiKeyRecord = {
      key: apiKey.trim(),
      baseUrl: (baseUrl ?? preset?.defaultBaseUrl ?? "").trim(),
      enabled: true,
      updatedAt: new Date().toISOString(),
    };

    await prisma.setting.upsert({
      where: { key: settingKey(provider) },
      create: {
        key: settingKey(provider),
        value: JSON.stringify(record),
      },
      update: {
        value: JSON.stringify(record),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      provider,
      maskedKey: maskKey(record.key),
    });
  } catch (err) {
    console.error("[api-keys PUT]", err);
    return NextResponse.json(
      { ok: false, error: "保存失败" },
      { status: 500 }
    );
  }
}

// ── DELETE ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");
    if (!provider) {
      return NextResponse.json(
        { ok: false, error: "缺少 provider 参数" },
        { status: 400 }
      );
    }

    await prisma.setting.deleteMany({
      where: { key: settingKey(provider) },
    });

    return NextResponse.json({ ok: true, provider });
  } catch (err) {
    console.error("[api-keys DELETE]", err);
    return NextResponse.json(
      { ok: false, error: "删除失败" },
      { status: 500 }
    );
  }
}

// ── 内部工具函数（供其他 API 路由调用）─────────────────────────

/**
 * 从 Setting 表读取某个 provider 的真实 API Key。
 * 优先 DB，若 DB 未配置则 fallback 到环境变量。
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
