import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/route-plans/:planId/activate
 * 激活指定路由方案，将其他方案设为非激活。
 * Demo: 模拟响应。真实环境写 DB route_plans.is_active。
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { planId: string } }
) {
  const { planId } = params;
  return NextResponse.json({
    ok: true,
    activatedPlanId: planId,
    message: `路由方案 ${planId} 已激活`
  });
}
