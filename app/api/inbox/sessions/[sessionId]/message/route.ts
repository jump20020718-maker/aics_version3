import { NextRequest } from "next/server";

/**
 * SSE 流式消息 API — Demo 用模拟端点
 * 真实环境替换为 LLM 调用 + RAG 检索 + 风控检查
 */

const SCENE_RESPONSES: Record<string, {
  reasoning: Array<{ icon: string; label: string; detail: string }>;
  text: string;
  citations: Array<{ docId: string; tier: number; simScore: number; title: string; snippet: string }>;
  model: string;
}> = {
  "B3-退换规则验证": {
    reasoning: [
      { icon: "🎯", label: "意图识别", detail: "退换政策咨询 / 破损申诉" },
      { icon: "🔍", label: "检索策略", detail: "hybrid@v2.1 top_k=5, tier≤2" },
      { icon: "📚", label: "命中文档", detail: "damage_signoff_sop (tier-1, sim=0.82)" },
      { icon: "🛡", label: "风险检查", detail: "empty_box_claim: 需人工核对" },
      { icon: "✍", label: "生成中", detail: "model=glm-z1-flash, tone=damage_calm_v1" }
    ],
    text: "感谢您的反馈。根据我们的进口商品破损取证 SOP，签收后 48 小时内提交完整证据（开箱 6 方位照片 + 损伤近景）可以走整机更换流程。\n\n由于您的订单金额较高（¥12,680），且当前证据尚不完整，我已为您升级到 L2 主管处理。主管会在 30 分钟内联系您。\n\n在此期间，建议您准备好以下材料以加快处理速度：\n1. 门板损伤近景照片（不同角度 2 张）\n2. 签收回执截图\n3. 如有外箱残留，也请拍照保留",
    citations: [
      { docId: "damage_signoff_sop", tier: 1, simScore: 0.82, title: "破损取证 SOP v3.2", snippet: "客户收货后 48h 内需提交：开箱 6 方位照片、外箱、标签、内部损伤近景。" },
      { docId: "DOC-PRC-CAT04", tier: 2, simScore: 0.61, title: "大家电退换规则卡 v2.1", snippet: "海外进口 > ¥5,000 的大家电：签收后 7 日内仅接受'故障/破损'退换。" }
    ],
    model: "glm-z1-flash"
  },
  "B1-中国使用兼容性": {
    reasoning: [
      { icon: "🎯", label: "意图识别", detail: "电压/插头兼容性查询" },
      { icon: "🔍", label: "检索策略", detail: "dense top_k=3" },
      { icon: "📚", label: "命中文档", detail: "DOC-CN-VOLTAGE-COMPAT (tier-1, sim=0.88)" },
      { icon: "✍", label: "生成中", detail: "model=glm-4-flash (简单查询路由)" }
    ],
    text: "这台设备的电压和插头信息如下：\n\n**电压兼容性**：该机型为 220V/50Hz 设计，与中国大陆电网完全兼容，无需变压器。\n\n**插头适配**：欧规圆头插头（Schuko），需要一个欧标转国标转换头。发货时默认附赠基础转换头，建议长期使用可购买带独立地线的转换插座（¥30-80）。\n\n如您还有其他使用方面的疑问，随时告诉我。",
    citations: [
      { docId: "DOC-CN-VOLTAGE-COMPAT", tier: 1, simScore: 0.88, title: "欧美进口家电中国电压兼容清单", snippet: "220V / 50Hz 双压机型可直接使用；115V 机型必须外接 500W+ 隔离变压器。" }
    ],
    model: "glm-4-flash"
  },
  "B4-运输周期焦虑": {
    reasoning: [
      { icon: "🎯", label: "意图识别", detail: "物流时效查询 / 焦虑安抚" },
      { icon: "🔍", label: "检索策略", detail: "hybrid@v2.1 top_k=3" },
      { icon: "📚", label: "命中文档", detail: "shipping_eta_card (tier-2, sim=0.74)" },
      { icon: "🛠", label: "工具调用", detail: "logistics_query → customs_clearing · 第5天" },
      { icon: "✍", label: "生成中", detail: "model=glm-4-flash, tone=sympathy_v1" }
    ],
    text: "完全理解您的担心。我刚查了您的物流详情：\n\n**当前状态**：清关中（第 5 天）\n**承运商**：OceanBridge 海运\n**预计到达**：仍在承诺时效内\n\n清关时长受海关抽检批次影响，5 天在正常范围内（通常 2-7 个工作日）。近期该口岸进口家电通关量较大，可能比平时略慢 1-2 天。\n\n我会持续关注您的物流动态，如有异常会第一时间通知您。请放心，目前一切正常进行中。",
    citations: [
      { docId: "DOC-SHIPPING-ETA", tier: 2, simScore: 0.74, title: "运输时效说明卡", snippet: "海运清关通常 2-7 个工作日，受海关抽检和口岸排队影响。" }
    ],
    model: "glm-4-flash"
  }
};

const DEFAULT_RESPONSE = {
  reasoning: [
    { icon: "🎯", label: "意图识别", detail: "通用咨询" },
    { icon: "🔍", label: "检索策略", detail: "hybrid@v2.1 top_k=5" },
    { icon: "📚", label: "命中文档", detail: "综合多文档参考" },
    { icon: "✍", label: "生成中", detail: "model=glm-4-flash" }
  ],
  text: "感谢您的咨询。关于您提到的问题，我查阅了相关的产品资料和政策文档。\n\n根据我们的服务政策，跨境进口家电享受进口商提供的保修服务。如果您需要进一步了解具体的保修范围、退换条件或使用建议，请告诉我具体的问题，我会为您查询最准确的信息。\n\n我们始终以 RAG 知识库中的官方文档为依据，确保给您的每一条建议都有据可查。",
  citations: [
    { docId: "DOC-GENERAL-FAQ", tier: 2, simScore: 0.65, title: "跨境家电通用FAQ", snippet: "跨境进口家电服务政策概览：保修、退换、物流时效等常见问题。" }
  ],
  model: "glm-4-flash"
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const body = await req.json();
  const scene: string = body.sessionScene ?? "";

  const resp = SCENE_RESPONSES[scene] ?? DEFAULT_RESPONSE;

  const encoder = new TextEncoder();

  // Detect multi-question / long message → emit plan breakdown
  const content: string = body.content ?? "";
  const questionMarks = (content.match(/[？?]/g) ?? []).length;
  const needsPlan = content.length > 500 || questionMarks >= 3;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      const startTime = Date.now();

      try {
        // 1) plan breakdown（长消息或多问题时触发）
        if (needsPlan) {
          emit("plan", {
            steps: [
              { text: "确认产品型号及使用场景", status: "pending" },
              { text: "查询 RAG 知识库获取相关政策", status: "pending" },
              { text: "逐条回答您的问题", status: "pending" }
            ]
          });
          await sleep(400);
          emit("plan_update", {
            steps: [
              { text: "确认产品型号及使用场景", status: "doing" },
              { text: "查询 RAG 知识库获取相关政策", status: "pending" },
              { text: "逐条回答您的问题", status: "pending" }
            ]
          });
          await sleep(200);
        }

        // 2) thinking events（意图分析阶段，先于 reasoning steps）
        const thinkingStages = [
          { stage: "intent",   detail: "识别用户意图与情绪状态" },
          { stage: "context",  detail: "关联订单 / 历史会话上下文" },
          { stage: "retrieve", detail: "确定 RAG 检索策略" }
        ];
        for (const t of thinkingStages) {
          await sleep(120 + Math.random() * 80);
          emit("thinking", t);
        }

        // 3) reasoning steps（RAG / 工具调用 / 风控细节）
        for (const step of resp.reasoning) {
          await sleep(260 + Math.random() * 160);
          emit("reasoning", step);
        }

        // mark plan step 1 done, step 2 doing
        if (needsPlan) {
          emit("plan_update", {
            steps: [
              { text: "确认产品型号及使用场景", status: "done" },
              { text: "查询 RAG 知识库获取相关政策", status: "doing" },
              { text: "逐条回答您的问题", status: "pending" }
            ]
          });
          await sleep(150);
        }

        // 4) token stream
        const chars = resp.text.split("");
        let batch = "";
        for (let i = 0; i < chars.length; i++) {
          batch += chars[i];
          if (batch.length >= 2 + Math.floor(Math.random() * 3) || i === chars.length - 1) {
            emit("token", { delta: batch });
            batch = "";
            await sleep(15 + Math.random() * 25);
          }
        }

        // mark plan all done
        if (needsPlan) {
          emit("plan_update", {
            steps: [
              { text: "确认产品型号及使用场景", status: "done" },
              { text: "查询 RAG 知识库获取相关政策", status: "done" },
              { text: "逐条回答您的问题", status: "done" }
            ]
          });
        }

        // 5) citations
        for (const c of resp.citations) {
          await sleep(50);
          emit("citation", c);
        }

        // 6) done
        const latencyMs = Date.now() - startTime;
        emit("done", {
          messageId: `m_a_${Date.now()}`,
          latencyMs,
          model: resp.model
        });

      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "internal error";
        emit("error", { code: "STREAM_ERROR", message });
      }

      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive"
    }
  });
}
