// ============================================================
// 模型配置工具函数（不在 route 文件中，避免 Next.js 路由冲突）
// ============================================================

import { prisma } from "./prisma";

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
 * 供 message/route.ts 调用
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
