// ============================================================
// GET  /api/models
//   返回模型注册表，优先从 DB 读取，DB 为空时返回内置默认列表
//
// POST /api/models
//   新增或更新一条模型配置
//   body: Model 字段（见 Prisma schema）
//
// PATCH /api/models/[id]/toggle
//   切换 enabled 状态（在 /api/models/[id]/toggle 路由中）
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PROVIDER_PRESETS } from "@/lib/llm/client";

// ── GET ───────────────────────────────────────────────────────
export async function GET() {
  try {
    const models = await prisma.model.findMany({
      orderBy: [{ enabled: "desc" }, { createdAt: "asc" }],
    });

    if (models.length === 0) {
      // DB 没有数据时返回预设列表，提示用户先运行 seed
      return NextResponse.json({
        ok: true,
        data: [],
        hint: "数据库中暂无模型配置，请运行 npm run db:seed 初始化，或通过 POST /api/models 手动添加",
      });
    }

    return NextResponse.json({
      ok: true,
      data: models.map((m) => ({
        ...m,
        capabilityTags: safeParseJson<string[]>(m.capabilityTags, []),
      })),
    });
  } catch (err) {
    console.error("[models GET]", err);
    return NextResponse.json(
      { ok: false, error: "读取模型列表失败" },
      { status: 500 }
    );
  }
}

// ── POST ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      provider,
      baseUrl,
      apiKeyEnv,
      modelId,
      contextWindow,
      supportsStreaming,
      supportsReasoning,
      supportsTools,
      capabilityTags,
      costPer1kInput,
      costPer1kOutput,
      defaultTemp,
      timeoutMs,
      maxRetries,
      enabled,
    } = body;

    if (!name || !provider || !modelId) {
      return NextResponse.json(
        { ok: false, error: "name、provider、modelId 为必填项" },
        { status: 400 }
      );
    }

    const preset = PROVIDER_PRESETS[provider];
    const data = {
      name: String(name),
      provider: String(provider),
      baseUrl: String(baseUrl || preset?.defaultBaseUrl || ""),
      apiKeyEnv: String(apiKeyEnv || `${provider.toUpperCase()}_API_KEY`),
      modelId: String(modelId),
      contextWindow: Number(contextWindow ?? 128000),
      supportsStreaming: supportsStreaming !== false,
      supportsReasoning: Boolean(supportsReasoning),
      supportsTools: supportsTools !== false,
      capabilityTags: JSON.stringify(capabilityTags ?? []),
      costPer1kInput: Number(costPer1kInput ?? 0),
      costPer1kOutput: Number(costPer1kOutput ?? 0),
      defaultTemp: Number(defaultTemp ?? 0.3),
      timeoutMs: Number(timeoutMs ?? 30000),
      maxRetries: Number(maxRetries ?? 2),
      enabled: enabled !== false,
    };

    const model = await prisma.model.upsert({
      where: { name: data.name },
      create: data,
      update: data,
    });

    return NextResponse.json({ ok: true, data: model });
  } catch (err) {
    console.error("[models POST]", err);
    return NextResponse.json(
      { ok: false, error: "保存模型失败" },
      { status: 500 }
    );
  }
}

// ── 工具函数（供内部路由使用）────────────────────────────────

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/**
 * 获取当前激活路由方案中的模型配置。
 * 如果没有激活路由方案，取第一个 enabled=true 的模型作为兜底。
 */
export async function getActiveModel() {
  try {
    // 尝试读取激活的路由方案
    const activePlan = await prisma.routePlan.findFirst({
      where: { isActive: true },
    });

    if (activePlan) {
      const model = await prisma.model.findUnique({
        where: { id: activePlan.fallbackModelId },
      });
      if (model?.enabled) return model;
    }

    // fallback：取第一个 enabled 的模型
    return await prisma.model.findFirst({ where: { enabled: true } });
  } catch {
    return null;
  }
}
