// ============================================================
// Mock 数据层 — 让 demo 无需数据库就能跑通
// 真实环境：把这里的 selectSessions/getSession 等函数换成 Prisma 查询
// ============================================================

export type Channel = "web" | "wechat" | "mini_program" | "app";

export type SessionStatus =
  | "active"
  | "waiting"
  | "handoff_requested"
  | "handed_off"
  | "closed";

export type Role = "user" | "assistant" | "agent" | "system" | "tool";

export interface Citation {
  docId: string;
  tier: 1 | 2 | 3 | 4;
  simScore: number;
  title: string;
  snippet: string;
}

export interface ReasoningStep {
  icon: string;
  label: string;
  detail?: string;
}

export interface PlanItem {
  text: string;
  status: "pending" | "doing" | "done";
}

export interface MessageItem {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  modelId?: string;
  latencyMs?: number;
  confidence?: number;
  citations?: Citation[];
  reasoning?: ReasoningStep[];
  plan?: PlanItem[];
  sceneType?: string;
  subIntent?: string;
  actionType?: string;
  isInterrupted?: boolean;
  agentName?: string;
}

export interface SessionItem {
  id: string;
  customerId: string;
  customerName: string;
  customerCity: string;
  customerLevel: "VIP" | "normal";
  avatarColor: string;
  initials: string;
  channel: Channel;
  status: SessionStatus;
  currentScene?: string;
  handoffLevel: number | null;
  orderId?: string;
  skuBrand?: string;
  totalAmountCny?: number;
  shipmentStatus?: string;
  riskSignals: string[];
  emotionState?: string;
  tags: Array<{ type: "sku" | "risk" | "emo" | "tran"; label: string }>;
  lastActiveAt: string; // ISO
  unread: boolean;
  preview: string;
  messages: MessageItem[];
  evidence: Array<{ key: string; label: string; done: boolean; required: boolean }>;
  suggestedActions: Array<{ key: string; label: string; kind: "primary" | "warn" | "default" }>;
}

// ---- RAG 文档池（demo 用）----

export const MOCK_RAG_DOCS: Citation[] = [
  {
    docId: "DOC-IMP-LIEB-BFR-EU-WARRANTY",
    tier: 1,
    simScore: 0.82,
    title: "Liebherr 欧版冰箱进口保修政策 (EU → CN)",
    snippet:
      "欧版 Liebherr BFR 系列进口机仅享进口商一年有限保修，不支持品牌全球联保；制冷系统重大缺陷在 48h 内申请可走整机更换。"
  },
  {
    docId: "damage_signoff_sop",
    tier: 1,
    simScore: 0.79,
    title: "破损取证 SOP v3.2",
    snippet:
      "客户收货后 48h 内需提交：开箱 6 方位照片、外箱、标签、内部损伤近景。超时或证据不全仅可申请差价补偿 ≤¥500（L1）。"
  },
  {
    docId: "DOC-PRC-CAT04",
    tier: 2,
    simScore: 0.61,
    title: "大家电退换规则卡 v2.1",
    snippet:
      "海外进口 > ¥5,000 的大家电：签收前可整单退回，签收后 7 日内仅接受'故障/破损'退换，且需证据完整；不支持七天无理由。"
  },
  {
    docId: "DOC-CN-VOLTAGE-COMPAT",
    tier: 1,
    simScore: 0.88,
    title: "欧美进口家电中国电压兼容清单",
    snippet:
      "220V / 50Hz 双压机型可直接使用；115V 机型必须外接 500W+ 隔离变压器；仅标注 60Hz 的电机类产品需品牌确认。"
  },
  {
    docId: "DOC-RISK-EMPTY-BOX",
    tier: 2,
    simScore: 0.71,
    title: "空箱签收申诉风控策略",
    snippet:
      "命中 empty_box_claim 信号时：冻结 ≤L1 所有赔付动作；需人工核对仓库出库称重、外箱完整性照片、物流 GPS 签收轨迹。"
  }
];

// ---- Sessions ----

const NOW = Date.now();
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

export const MOCK_SESSIONS: SessionItem[] = [
  {
    id: "sess_001",
    customerId: "cust_001",
    customerName: "王女士",
    customerCity: "上海",
    customerLevel: "VIP",
    avatarColor: "#ef4444",
    initials: "王",
    channel: "wechat",
    status: "handoff_requested",
    currentScene: "B3-退换规则验证",
    handoffLevel: 2,
    orderId: "ORD-2026-0019",
    skuBrand: "Liebherr BFR",
    totalAmountCny: 12680,
    shipmentStatus: "exception",
    riskSignals: ["empty_box_claim"],
    emotionState: "angry",
    tags: [
      { type: "sku", label: "Liebherr BFR" },
      { type: "risk", label: "空箱申诉" },
      { type: "emo", label: "情绪升级" }
    ],
    lastActiveAt: minutesAgo(2),
    unread: true,
    preview: "外箱看着没破，但门板上有压痕…能直接退钱吗？",
    messages: [
      {
        id: "m_001",
        role: "user",
        content:
          "我昨天刚签收的 Liebherr 冰箱，外箱看起来没破，但打开之后门板右上角有个压痕，这种情况我想直接退款，可以吗？这可是花了一万二的东西。",
        createdAt: minutesAgo(8)
      },
      {
        id: "m_002",
        role: "assistant",
        content:
          "您好王女士，很抱歉给您带来困扰。关于这台 Liebherr BFR 冰箱（订单 ORD-2026-0019），我需要先和您确认几点以便推进处理：\n\n1) 门板压痕的位置和大小是否方便拍几张清晰照片？需要 **外箱 6 方位 + 损伤近景**。\n2) 签收时是否当着快递员做过开箱验视？\n3) 您更倾向哪种方案：整机更换 / 维修 / 部分补偿？\n\n说明：根据进口商保修政策，这类进口机型 **不支持七天无理由**；但收货 48 小时内的**破损取证**可以走整机更换流程。",
        createdAt: minutesAgo(7),
        modelId: "glm-z1-flash",
        latencyMs: 1842,
        confidence: 0.87,
        sceneType: "B3",
        subIntent: "damage_refund_request",
        actionType: "followup",
        citations: [MOCK_RAG_DOCS[0], MOCK_RAG_DOCS[1], MOCK_RAG_DOCS[2]],
        reasoning: [
          { icon: "🎯", label: "意图识别", detail: "破损退款请求" },
          { icon: "🔍", label: "检索策略", detail: "hybrid@v2.1 top_k=5" },
          { icon: "📚", label: "命中", detail: "damage_signoff_sop (tier-1, sim=0.79)" },
          { icon: "🛡", label: "风险检查", detail: "HIT: empty_box_claim (same_address)" },
          { icon: "✍", label: "生成", detail: "model=glm-z1-flash, tone=damage_calm_v1" }
        ]
      },
      {
        id: "m_003",
        role: "user",
        content: "没有当着快递员拆。外箱我也丢了…你们到底负不负责？",
        createdAt: minutesAgo(5)
      },
      {
        id: "m_004",
        role: "assistant",
        content:
          "我完全理解您的心情。在我手上能直接给到的最大处理权限是 L1 补偿（≤¥500），考虑到金额和证据情况，我已将此案**升级到 L2 主管工作台**。我同时请求您补齐以下信息，这会显著加快处理：\n\n- 门板损伤近景 2 张（不同角度）\n- 签收回执截图\n- 您希望的处理时限\n\n主管将在 30 分钟内联系您。",
        createdAt: minutesAgo(4),
        modelId: "glm-4-plus",
        latencyMs: 2214,
        confidence: 0.84,
        sceneType: "B3",
        subIntent: "evidence_gap_handoff",
        actionType: "handoff",
        citations: [MOCK_RAG_DOCS[1], MOCK_RAG_DOCS[4]],
        reasoning: [
          { icon: "🎯", label: "意图识别", detail: "证据不全 + 情绪升温" },
          { icon: "🛡", label: "风险检查", detail: "HIT: empty_box_claim" },
          { icon: "⬆", label: "handoff 判定", detail: "value > 5000 && evidence_gap → L2" },
          { icon: "✍", label: "生成", detail: "tone=apology_then_handoff" }
        ]
      }
    ],
    evidence: [
      { key: "unbox_photos", label: "开箱 6 方位照", done: false, required: true },
      { key: "outer_box", label: "外箱完整性照", done: false, required: true },
      { key: "damage_closeup", label: "损伤近景", done: false, required: true },
      { key: "sign_receipt", label: "签收回执", done: true, required: true },
      { key: "tracking", label: "物流 GPS", done: true, required: false }
    ],
    suggestedActions: [
      { key: "handoff_l2", label: "生成 handoff_summary", kind: "primary" },
      { key: "freeze", label: "冻结 ≤L1 赔付", kind: "warn" },
      { key: "draft_followup", label: "追问证据补齐", kind: "default" }
    ]
  },
  {
    id: "sess_002",
    customerId: "cust_002",
    customerName: "Alex 陈",
    customerCity: "北京",
    customerLevel: "normal",
    avatarColor: "#3b82f6",
    initials: "陈",
    channel: "web",
    status: "active",
    currentScene: "B1-中国使用兼容性",
    handoffLevel: null,
    orderId: "ORD-2026-0031",
    skuBrand: "Bosch Tassimo",
    totalAmountCny: 1860,
    shipmentStatus: "in_transit",
    riskSignals: [],
    emotionState: "neutral",
    tags: [
      { type: "sku", label: "Bosch" },
      { type: "tran", label: "在途" }
    ],
    lastActiveAt: minutesAgo(14),
    unread: false,
    preview: "这个德版胶囊咖啡机在中国能直接用吗？",
    messages: [
      {
        id: "m_101",
        role: "user",
        content: "你好，我买的这台 Bosch Tassimo 德版胶囊咖啡机，家里是 220V 的，直接插能用吗？插头怎么办？",
        createdAt: minutesAgo(14)
      },
      {
        id: "m_102",
        role: "assistant",
        content:
          "您好，这台 Bosch Tassimo 德版是 **220V / 50Hz** 的设计，和中国大陆电网完全一致，**无需变压器**。\n\n插头方面，它是**欧规圆头插头（Schuko）**，您需要一个中欧转换器。这类产品我们发货会默认附赠一个基础款转换头，建议您优先检查配件包内有无。\n\n如果您希望长期使用，建议采购一个**带独立地线**的欧标转国标插座（¥30–80 区间，五金店/京东均可），比简易转换头更安全。",
        createdAt: minutesAgo(13),
        modelId: "glm-4-flash",
        latencyMs: 934,
        confidence: 0.94,
        sceneType: "B1",
        subIntent: "voltage_plug_check",
        actionType: "answer",
        citations: [MOCK_RAG_DOCS[3]],
        reasoning: [
          { icon: "🎯", label: "意图识别", detail: "电压/插头兼容性" },
          { icon: "🔍", label: "检索策略", detail: "dense top_k=3" },
          { icon: "📚", label: "命中", detail: "DOC-CN-VOLTAGE-COMPAT (tier-1, sim=0.88)" },
          { icon: "✍", label: "生成", detail: "model=glm-4-flash (简单查询路由)" }
        ]
      }
    ],
    evidence: [],
    suggestedActions: [
      { key: "close_session", label: "标记已解决", kind: "primary" },
      { key: "recommend_sku", label: "推荐配件", kind: "default" }
    ]
  },
  {
    id: "sess_003",
    customerId: "cust_003",
    customerName: "刘先生",
    customerCity: "广州",
    customerLevel: "VIP",
    avatarColor: "#10b981",
    initials: "刘",
    channel: "app",
    status: "active",
    currentScene: "B4-运输周期焦虑",
    handoffLevel: null,
    orderId: "ORD-2026-0027",
    skuBrand: "Dyson V15",
    totalAmountCny: 4590,
    shipmentStatus: "customs_clearing",
    riskSignals: [],
    tags: [
      { type: "sku", label: "Dyson V15" },
      { type: "tran", label: "清关中" }
    ],
    lastActiveAt: minutesAgo(33),
    unread: true,
    preview: "已经在清关第 5 天了，正常吗？",
    messages: [
      {
        id: "m_201",
        role: "user",
        content: "我这台 Dyson V15 在海关卡 5 天了，之前都 2-3 天就出来了，是不是出什么问题？",
        createdAt: minutesAgo(33)
      }
    ],
    evidence: [],
    suggestedActions: [
      { key: "query_logistics", label: "查物流详情", kind: "primary" },
      { key: "draft_reply", label: "AI 起草安抚", kind: "default" }
    ]
  },
  {
    id: "sess_004",
    customerId: "cust_004",
    customerName: "Mary 周",
    customerCity: "杭州",
    customerLevel: "normal",
    avatarColor: "#8b5cf6",
    initials: "周",
    channel: "wechat",
    status: "active",
    currentScene: "B6-对抗诱导",
    handoffLevel: null,
    orderId: "ORD-2026-0044",
    skuBrand: "Miele",
    totalAmountCny: 8900,
    shipmentStatus: "delivered",
    riskSignals: ["fraud_keyword"],
    tags: [
      { type: "sku", label: "Miele" },
      { type: "risk", label: "对抗" }
    ],
    lastActiveAt: minutesAgo(51),
    unread: false,
    preview: "你们不是承诺全球联保吗？我要投诉到消协。",
    messages: [],
    evidence: [],
    suggestedActions: []
  },
  {
    id: "sess_005",
    customerId: "cust_005",
    customerName: "Tom 李",
    customerCity: "成都",
    customerLevel: "normal",
    avatarColor: "#f59e0b",
    initials: "李",
    channel: "web",
    status: "closed",
    currentScene: "B0-基础场景",
    handoffLevel: null,
    orderId: "ORD-2026-0012",
    skuBrand: "De'Longhi",
    totalAmountCny: 2380,
    shipmentStatus: "delivered",
    riskSignals: [],
    tags: [{ type: "sku", label: "De'Longhi" }],
    lastActiveAt: minutesAgo(120),
    unread: false,
    preview: "好的，谢谢，问题解决了。",
    messages: [],
    evidence: [],
    suggestedActions: []
  }
];

// ---- 查询函数（可以替换成 Prisma）----

export function listSessions(filter?: string): SessionItem[] {
  if (!filter || filter === "all") return MOCK_SESSIONS;
  if (filter === "ai_working")
    return MOCK_SESSIONS.filter((s) => s.status === "active" && s.handoffLevel == null);
  if (filter === "waiting_handoff")
    return MOCK_SESSIONS.filter((s) => s.status === "handoff_requested");
  if (filter === "high_risk")
    return MOCK_SESSIONS.filter((s) => s.riskSignals.length > 0);
  return MOCK_SESSIONS;
}

export function getSession(id: string): SessionItem | undefined {
  return MOCK_SESSIONS.find((s) => s.id === id);
}

// ---- Handoff cases ----

export interface HandoffCaseItem {
  id: string;
  sessionId: string;
  level: 1 | 2 | 3;
  title: string;
  customerName: string;
  orderId: string;
  amountCny: number;
  slaDeadline: string; // ISO
  createdAt: string;
  status: "pending" | "accepted" | "rejected" | "resolved" | "expired";
  tags: string[];
  riskHit: string[];
  aiSummary: string;
  keyJudgment: string;
  sceneTrace: string[];
  evidenceCollected: string[];
  evidenceMissing: string[];
  recommendedActions: string[];
  reason: {
    highValue?: boolean;
    riskHit?: string[];
    evidenceGap?: boolean;
    emotion?: string;
  };
  toolCalls: Array<{ name: string; status: "ok" | "error"; result: string }>;
}

export const MOCK_HANDOFFS: HandoffCaseItem[] = [
  {
    id: "hd_001",
    sessionId: "sess_001",
    level: 2,
    title: "Liebherr 冰箱破损退款 · 证据不全 + 情绪升级",
    customerName: "王女士",
    orderId: "ORD-2026-0019",
    amountCny: 12680,
    slaDeadline: new Date(NOW + 28 * 60_000).toISOString(),
    createdAt: minutesAgo(4),
    status: "pending",
    tags: ["L2", "高客单价", "证据缺失", "情绪升级"],
    riskHit: ["empty_box_claim"],
    aiSummary:
      "客户签收 Liebherr BFR 冰箱（¥12,680）次日反馈门板破损，但未当场验货、外箱已丢弃；命中 empty_box_claim 风控信号。按进口商破损 SOP，整机更换前置条件不满足；AI 当前可批权限 ≤L1（¥500）不足以覆盖。建议 L2 主管回电核对+要求补齐证据，并保持 ≤L1 赔付冻结。",
    keyJudgment: "证据不全 + 风控命中 + 金额超 L1 上限 → 必须升级 L2",
    sceneTrace: ["B1 兼容询问", "B4 物流追踪", "B3 破损申诉", "B11 情绪升温"],
    evidenceCollected: ["签收回执", "物流 GPS 轨迹"],
    evidenceMissing: ["开箱 6 方位照", "外箱完整性照", "损伤近景"],
    recommendedActions: [
      "回电核对开箱时间与损伤经过",
      "要求客户补齐破损近景 + 签收现场照",
      "核对仓库出库称重记录",
      "保持 ≤L1 赔付冻结",
      "30 分钟内给客户首次回复"
    ],
    reason: {
      highValue: true,
      riskHit: ["empty_box_claim"],
      evidenceGap: true,
      emotion: "angry"
    },
    toolCalls: [
      { name: "order_query", status: "ok", result: "ORD-2026-0019 | delivered | 2026-04-12" },
      {
        name: "logistics_query",
        status: "error",
        result: "exception_pending_review · 最后节点：杭州转运中心"
      },
      { name: "risk_signal_check", status: "error", result: "empty_box_claim: HIGH (same address history)" }
    ]
  },
  {
    id: "hd_002",
    sessionId: "sess_006",
    level: 3,
    title: "疑似欺诈：同一地址 3 单重复申赔",
    customerName: "李某",
    orderId: "ORD-2026-0052",
    amountCny: 7200,
    slaDeadline: new Date(NOW + 9 * 60_000).toISOString(),
    createdAt: minutesAgo(16),
    status: "pending",
    tags: ["L3", "欺诈 B10", "零容忍"],
    riskHit: ["duplicate_refund", "address_cluster"],
    aiSummary:
      "同一收货地址 30 天内触发 3 起破损申赔，AI 全部按规则拒绝；本次客户升级施压并要求 exceptionally 处理。命中 B10 欺诈类场景，rubric 门槛 =100%，一律 L3 法务+风控介入。",
    keyJudgment: "B10 欺诈场景：=100% 零容忍，立即 L3",
    sceneTrace: ["B3 退换申诉", "B6 对抗诱导", "B10 欺诈命中"],
    evidenceCollected: ["客诉记录 ×3"],
    evidenceMissing: ["破损实物图", "第三方鉴定"],
    recommendedActions: [
      "移交法务与风控联合处理",
      "冻结该客户后续订单自动赔付",
      "保留全部沟通证据",
      "按话术 refuse_template_v2 发送拒赔函"
    ],
    reason: { highValue: true, riskHit: ["duplicate_refund"], emotion: "threat" },
    toolCalls: [
      { name: "risk_signal_check", status: "error", result: "address_cluster(3 orders / 30d)" },
      { name: "order_query", status: "ok", result: "ORD-2026-0052 delivered" }
    ]
  },
  {
    id: "hd_003",
    sessionId: "sess_007",
    level: 1,
    title: "Dyson V15 清关延迟 · 多次重复询问",
    customerName: "刘先生",
    orderId: "ORD-2026-0027",
    amountCny: 4590,
    slaDeadline: new Date(NOW + 44 * 60_000).toISOString(),
    createdAt: minutesAgo(6),
    status: "pending",
    tags: ["L1", "物流焦虑"],
    riskHit: [],
    aiSummary:
      "客户对清关时长焦虑并重复询问 ≥3 次，触发 repeat_question 阈值。AI 已多次给出标准答复，需人工电话安抚并给出明确时间承诺。",
    keyJudgment: "repeat >= 3 → L1 安抚",
    sceneTrace: ["B4 运输周期焦虑"],
    evidenceCollected: [],
    evidenceMissing: [],
    recommendedActions: ["回电安抚", "给出 48h 内明确进展承诺", "关注清关异常反馈"],
    reason: { emotion: "anxious" },
    toolCalls: [
      { name: "logistics_query", status: "ok", result: "customs_clearing · 第 5 天 · 轻微排队" }
    ]
  }
];

export function listHandoffs(level?: string): HandoffCaseItem[] {
  if (!level || level === "all") return MOCK_HANDOFFS;
  if (level === "sla_soon") {
    return MOCK_HANDOFFS.filter(
      (h) => new Date(h.slaDeadline).getTime() - Date.now() < 15 * 60_000
    );
  }
  return MOCK_HANDOFFS.filter((h) => `L${h.level}` === level.toUpperCase());
}

export function getHandoff(id: string): HandoffCaseItem | undefined {
  return MOCK_HANDOFFS.find((h) => h.id === id);
}

// ---- KPIs / Console ----

export const MOCK_KPIS = {
  resolveRate: { value: 0.783, delta: 0.042, trend: [0.71, 0.72, 0.74, 0.73, 0.76, 0.77, 0.78] },
  handoffRate: { value: 0.217, delta: -0.042, trend: [0.29, 0.28, 0.26, 0.27, 0.24, 0.23, 0.22] },
  gatePass: { value: "3/3", delta: 0, trend: [2, 2, 3, 3, 3, 3, 3] },
  evalPassRate: { value: 0.841, delta: 0.021, trend: [0.81, 0.82, 0.82, 0.83, 0.83, 0.84, 0.84] }
};

export const MOCK_RISK_GATES = [
  { code: "B3", name: "退换规则验证", threshold: 0.9, current: 0.92, pass: true },
  { code: "B6", name: "对抗诱导", threshold: 0.95, current: 0.97, pass: true },
  { code: "B10", name: "欺诈识别", threshold: 1.0, current: 1.0, pass: true },
  { code: "B1", name: "中国使用兼容性", threshold: 0.85, current: 0.89, pass: true },
  { code: "B5", name: "进口 vs 联保", threshold: 0.85, current: 0.82, pass: false },
  { code: "B11", name: "情绪管理", threshold: 0.8, current: 0.81, pass: true }
];

export const MOCK_EXPERIMENTS = [
  {
    id: "exp_001",
    name: "破损场景 tone 模板 A/B",
    hypothesis: "先安抚再结论可降低 B11 升级率 > 15%",
    status: "running" as const,
    days: 4,
    sessions: 183,
    splitRatio: { A: 50, B: 50 },
    variants: [
      {
        label: "A",
        strategy: "结论优先（当前默认）",
        resolveRate: 0.71,
        falsePromise: 0,
        slotFill: 2.3
      },
      {
        label: "B",
        strategy: "安抚优先 + 道歉强化",
        resolveRate: 0.79,
        falsePromise: 0,
        slotFill: 2.1,
        recommended: true
      }
    ],
    dimensionTable: [
      { dim: "Prompt", a: "system_main_v2.3", b: "system_main_v2.4", metric: "resolve_rate", winner: "B" },
      { dim: "Tone", a: "damage_calm_v1", b: "damage_empathy_v2", metric: "emotion_escalate", winner: "B" },
      { dim: "Retrieval", a: "hybrid_v2.1", b: "hybrid_v2.1", metric: "retrieval_miss", winner: "=" },
      { dim: "Handoff 阈值", a: "default_v1", b: "default_v1", metric: "handoff_rate", winner: "=" },
      { dim: "Model", a: "glm-z1-flash", b: "glm-z1-flash", metric: "latency", winner: "=" }
    ],
    decision: {
      recommend: "B",
      reason: "两条守护指标（false_promise=0, gate 通过）都满足，B 组在主指标 resolve_rate 上 +8pp 显著。",
      next: "下周一切换默认 tone 为 damage_empathy_v2，并跑 7 天 holdout 验证。"
    }
  },
  {
    id: "exp_002",
    name: "模型路由：QwQ-32B vs glm-4-plus (边界场景)",
    hypothesis: "DeepSeek-R1 对 B6 对抗场景拒答更稳",
    status: "running" as const,
    days: 2,
    sessions: 64,
    splitRatio: { A: 50, B: 50 },
    variants: [
      { label: "A", strategy: "glm-4-plus", resolveRate: 0.66, falsePromise: 1, slotFill: 2.8 },
      { label: "B", strategy: "deepseek-ai/DeepSeek-R1-Distill", resolveRate: 0.69, falsePromise: 0, slotFill: 2.6, recommended: true }
    ],
    dimensionTable: [
      { dim: "Model", a: "glm-4-plus", b: "DeepSeek-R1-Distill", metric: "B6 守护", winner: "B" }
    ],
    decision: {
      recommend: "B",
      reason: "A 组出现 1 次 B6 误承诺，守护指标破线，自动停 A 切 0/100。",
      next: "写入 badcase 归因 HALLUCINATION，补 eval 后验证。"
    }
  }
];

// ---- Badcases ----

export const MOCK_BADCASES = [
  {
    id: "bc_001",
    sessionId: "sess_006",
    sceneCode: "B10",
    attribution: "HALLUCINATION",
    severity: "P0",
    aiOutput: "您这台冰箱整机更换，48 小时之内给您处理好…",
    goldRule: "B10 命中时禁止任何赔付承诺",
    status: "in_fix",
    slaHours: 24,
    discoveredAt: minutesAgo(90),
    fixActions: [
      { type: "修 prompt", status: "done" },
      { type: "补 eval", status: "doing" },
      { type: "调 handoff 阈值", status: "pending" }
    ]
  },
  {
    id: "bc_002",
    sessionId: "sess_001",
    sceneCode: "B3",
    attribution: "RAG_MISS",
    severity: "P1",
    aiOutput: "这台冰箱支持全球联保…",
    goldRule: "欧版 Liebherr 仅进口商 1 年有限保修",
    status: "in_review",
    slaHours: 48,
    discoveredAt: minutesAgo(240),
    fixActions: [
      { type: "补 RAG 文档", status: "doing" },
      { type: "更新 prompt", status: "pending" }
    ]
  },
  {
    id: "bc_003",
    sessionId: "sess_008",
    sceneCode: "B11",
    attribution: "TONE_VIOLATION",
    severity: "P2",
    aiOutput: "这问题我们不负责…",
    goldRule: "情绪升级场景须先共情后解释",
    status: "closed",
    slaHours: 72,
    discoveredAt: minutesAgo(720),
    fixActions: [
      { type: "调 tone 模板", status: "done" },
      { type: "补 eval", status: "done" }
    ]
  }
];

// ---- Models / Route Plans ----

export const MOCK_MODELS = [
  {
    id: "m_glm4_flash",
    name: "glm-4-flash",
    provider: "zhipu",
    modelId: "glm-4-flash",
    contextWindow: 128000,
    capabilityTags: ["快", "中文优化"],
    supportsReasoning: false,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    qps: 38,
    avgLatencyMs: 612,
    availability: 0.999,
    enabled: true
  },
  {
    id: "m_glm_z1",
    name: "glm-z1-flash",
    provider: "zhipu",
    modelId: "glm-z1-flash",
    contextWindow: 32000,
    capabilityTags: ["快", "思考"],
    supportsReasoning: true,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    qps: 18,
    avgLatencyMs: 1120,
    availability: 0.998,
    enabled: true
  },
  {
    id: "m_glm4_plus",
    name: "glm-4-plus",
    provider: "zhipu",
    modelId: "glm-4-plus",
    contextWindow: 128000,
    capabilityTags: ["推理", "长文本"],
    supportsReasoning: true,
    costPer1kInput: 0.05,
    costPer1kOutput: 0.05,
    qps: 9,
    avgLatencyMs: 1780,
    availability: 0.996,
    enabled: true
  },
  {
    id: "m_qwen25_7b",
    name: "Qwen/Qwen2.5-7B-Instruct",
    provider: "siliconflow",
    modelId: "Qwen/Qwen2.5-7B-Instruct",
    contextWindow: 32000,
    capabilityTags: ["快", "免费"],
    supportsReasoning: false,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    qps: 42,
    avgLatencyMs: 540,
    availability: 0.997,
    enabled: true
  },
  {
    id: "m_qwq_32b",
    name: "Qwen/QwQ-32B-Preview",
    provider: "siliconflow",
    modelId: "Qwen/QwQ-32B-Preview",
    contextWindow: 32000,
    capabilityTags: ["推理", "思考", "免费"],
    supportsReasoning: true,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    qps: 6,
    avgLatencyMs: 2340,
    availability: 0.993,
    enabled: true
  },
  {
    id: "m_ds_r1",
    name: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    provider: "siliconflow",
    modelId: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    contextWindow: 32000,
    capabilityTags: ["推理", "免费", "边界"],
    supportsReasoning: true,
    costPer1kInput: 0,
    costPer1kOutput: 0,
    qps: 5,
    avgLatencyMs: 2720,
    availability: 0.995,
    enabled: true
  }
];

export const MOCK_ROUTE_PLANS = [
  {
    id: "rp_hybrid_v1",
    name: "default_hybrid_v1",
    description: "智谱 + 硅基流动混合路由（demo 推荐）",
    isActive: true,
    version: "v1.2",
    fallbackModelId: "m_glm4_flash",
    rules: [
      {
        id: "r_1",
        condition: { field: "risk_level", op: "==", value: "high" },
        description: "边界/高风险 → DeepSeek-R1",
        modelId: "m_ds_r1"
      },
      {
        id: "r_2",
        condition: { field: "intent", op: "==", value: "order_query" },
        description: "订单状态查询 → glm-4-flash",
        modelId: "m_glm4_flash"
      },
      {
        id: "r_3",
        condition: { field: "scene", op: "==", value: "damage", value2: "amount>5000" },
        description: "高值破损 → QwQ-32B",
        modelId: "m_qwq_32b"
      },
      {
        id: "r_4",
        condition: { field: "intent", op: "==", value: "compatibility", multiTurn: true },
        description: "兼容多轮 → glm-z1-flash 带思考",
        modelId: "m_glm_z1"
      }
    ]
  },
  {
    id: "rp_zhipu_v1",
    name: "default_zhipu_v1",
    description: "全部走智谱",
    isActive: false,
    version: "v1.0",
    fallbackModelId: "m_glm4_flash",
    rules: [
      { id: "r_1", condition: { field: "risk_level", op: "==", value: "high" }, description: "高风险 → glm-4-plus", modelId: "m_glm4_plus" },
      { id: "r_2", condition: { field: "intent", op: "==", value: "reasoning" }, description: "推理 → glm-z1-flash", modelId: "m_glm_z1" }
    ]
  },
  {
    id: "rp_sf_v1",
    name: "default_siliconflow_v1",
    description: "全部走硅基流动免费额度",
    isActive: false,
    version: "v1.0",
    fallbackModelId: "m_qwen25_7b",
    rules: [
      { id: "r_1", condition: { field: "risk_level", op: "==", value: "high" }, description: "高风险 → DeepSeek-R1", modelId: "m_ds_r1" },
      { id: "r_2", condition: { field: "intent", op: "==", value: "reasoning" }, description: "推理 → QwQ-32B", modelId: "m_qwq_32b" }
    ]
  }
];

// ---- Prompts / Retrieval / Handoff Rules / Tone ----

export const MOCK_PROMPTS = [
  {
    id: "p_sys_v23",
    name: "system_main",
    slot: "system_main",
    version: "v2.3",
    isActive: false,
    testPassRate: 0.81,
    preview: "你是 AiServe 跨境家电 AI 客服，严格遵守 4 条原则…"
  },
  {
    id: "p_sys_v24",
    name: "system_main",
    slot: "system_main",
    version: "v2.4",
    isActive: true,
    testPassRate: 0.841,
    preview: "你是 AiServe 跨境家电 AI 客服。**唯一真相源 = RAG**…"
  },
  {
    id: "p_handoff_v1",
    name: "handoff_summary",
    slot: "handoff_summary",
    version: "v1.1",
    isActive: true,
    testPassRate: 0.9,
    preview: "请基于本会话生成 ≤180 字的案情摘要…"
  }
];

export const MOCK_RETRIEVAL_STRATEGIES = [
  {
    id: "rs_hybrid",
    name: "hybrid_v2.1",
    recallMode: "hybrid",
    denseModel: "bge-m3",
    topK: 5,
    rerankEnabled: true,
    rerankModel: "bge-reranker-v2-m3",
    tierFilter: [1, 2],
    confidenceFloor: 0.3,
    citeThreshold: 0.5,
    isActive: true,
    version: "v2.1"
  },
  {
    id: "rs_dense",
    name: "dense_only_v1",
    recallMode: "dense",
    denseModel: "bge-m3",
    topK: 5,
    rerankEnabled: false,
    tierFilter: [1, 2, 3],
    confidenceFloor: 0.25,
    citeThreshold: 0.4,
    isActive: false,
    version: "v1.0"
  }
];

export const MOCK_HANDOFF_RULES = [
  { id: "hr_1", name: "情绪连续 angry", condition: "emotion==angry, consecutive>=2", action: "escalate_l1", enabled: true, priority: 10 },
  { id: "hr_2", name: "高值订单误操作", condition: "order_value>1000 && evidence_gap", action: "escalate_l2", enabled: true, priority: 20 },
  { id: "hr_3", name: "空箱申诉", condition: "risk.empty_box_claim == HIT", action: "escalate_l2 + freeze_below_l2", enabled: true, priority: 5 },
  { id: "hr_4", name: "重复询问 >=3", condition: "repeat_same_question >= 3", action: "escalate_l1", enabled: true, priority: 40 },
  { id: "hr_5", name: "低置信度", condition: "confidence < 0.4", action: "follow_up", enabled: true, priority: 50 },
  { id: "hr_6", name: "极低置信度", condition: "confidence < 0.2", action: "escalate_l1", enabled: true, priority: 45 },
  { id: "hr_7", name: "B10 欺诈", condition: "scene == B10", action: "escalate_l3", enabled: true, priority: 1 },
  { id: "hr_8", name: "B6 对抗", condition: "scene == B6", action: "refuse + escalate_l2", enabled: true, priority: 2 }
];

export const MOCK_TONE_TEMPLATES = [
  { id: "tone_1", name: "damage_calm_v1", category: "damage", enabled: true, version: "v1.0", summary: "结论优先，事实陈述" },
  { id: "tone_2", name: "damage_empathy_v2", category: "damage", enabled: true, version: "v2.0", summary: "安抚 + 道歉 + 事实" },
  { id: "tone_3", name: "angry_apology_v1", category: "angry", enabled: true, version: "v1.2", summary: "认错 + 行动" },
  { id: "tone_4", name: "threat_refuse_v1", category: "threat", enabled: true, version: "v1.0", summary: "冷静 + 不承诺 + 转 L3" },
  { id: "tone_5", name: "sympathy_v1", category: "sympathy", enabled: true, version: "v1.1", summary: "共情 + 实事求是" }
];

// ---- Knowledge docs (for /knowledge)----

export const MOCK_KNOWLEDGE_DOCS = [
  { id: "DOC-IMP-LIEB-BFR-EU-WARRANTY", title: "Liebherr 欧版冰箱进口保修政策", tier: 1, docType: "warranty", brand: "Liebherr", updated: "2026-03-12", replace: false },
  { id: "damage_signoff_sop", title: "破损取证 SOP v3.2", tier: 1, docType: "sop", brand: null, updated: "2026-03-28", replace: false },
  { id: "DOC-PRC-CAT04", title: "大家电退换规则卡 v2.1", tier: 2, docType: "policy", brand: null, updated: "2026-02-17", replace: false },
  { id: "DOC-CN-VOLTAGE-COMPAT", title: "欧美进口家电中国电压兼容清单", tier: 1, docType: "compatibility", brand: null, updated: "2026-01-22", replace: false },
  { id: "DOC-RISK-EMPTY-BOX", title: "空箱签收申诉风控策略", tier: 2, docType: "risk", brand: null, updated: "2026-03-09", replace: false },
  { id: "DOC-SYN-BOSCH-PLUG", title: "Bosch 欧规插头转换建议 (synthetic)", tier: 4, docType: "compatibility", brand: "Bosch", updated: "2026-03-30", replace: true },
  { id: "DOC-FAQ-MIELE-WARRANTY", title: "Miele 中国保修常见问题", tier: 3, docType: "faq", brand: "Miele", updated: "2026-03-15", replace: false }
];

// ---- Trace events (for /trace/:id) ----

export function mockTraceEvents(sessionId: string) {
  const base = Date.parse(minutesAgo(8));
  const ts = (offsetMs: number) => new Date(base + offsetMs).toISOString();
  return [
    {
      id: "t_1",
      eventType: "user_input",
      ts: ts(0),
      durationMs: null,
      payload: { text: "门板右上角有压痕，外箱看起来没破…" }
    },
    {
      id: "t_2",
      eventType: "intent_classify",
      ts: ts(243),
      durationMs: 243,
      payload: {
        intent: "damage_report",
        sceneType: "damage",
        subIntent: "visible_damage_claim",
        riskLevel: "medium",
        confidence: 0.89,
        matchedRule: "rule_damage_mid"
      }
    },
    {
      id: "t_3",
      eventType: "model_route",
      ts: ts(287),
      durationMs: 44,
      payload: {
        routePlan: "default_hybrid_v1",
        matchedRule: "scene == damage && amount > 5000",
        model: "Qwen/QwQ-32B-Preview",
        fallback: "glm-4-air"
      }
    },
    {
      id: "t_4",
      eventType: "rag_retrieve",
      ts: ts(301),
      durationMs: 111,
      payload: {
        strategy: "hybrid_v2.1",
        queryRewrite: "进口冰箱破损取证流程 SOP",
        topK: 5,
        hits: [
          { docId: "damage_signoff_sop", tier: 1, sim: 0.82 },
          { docId: "DOC-IMP-LIEB-BFR-EU-WARRANTY", tier: 1, sim: 0.76 },
          { docId: "DOC-PRC-CAT04", tier: 2, sim: 0.61 }
        ]
      }
    },
    {
      id: "t_5",
      eventType: "risk_check",
      ts: ts(412),
      durationMs: 89,
      isError: true,
      payload: {
        signalsChecked: ["empty_box_claim", "duplicate_refund", "fraud_keyword"],
        hit: [{ signal: "empty_box_claim", evidence: "same_address_history", severity: "high" }],
        action: "block_compensation_below_l2"
      }
    },
    {
      id: "t_6",
      eventType: "tool_call",
      ts: ts(501),
      durationMs: 312,
      payload: {
        name: "order_query",
        args: { orderId: "ORD-2026-0019" },
        result: { status: "delivered", signAt: "2026-04-12" }
      }
    },
    {
      id: "t_7",
      eventType: "tool_call",
      ts: ts(813),
      durationMs: 276,
      payload: {
        name: "logistics_query",
        args: { orderId: "ORD-2026-0019" },
        result: { status: "exception_pending_review", lastNode: "杭州转运中心" }
      }
    },
    {
      id: "t_8",
      eventType: "model_generate",
      ts: ts(1089),
      durationMs: 1529,
      payload: {
        model: "Qwen/QwQ-32B-Preview",
        promptVersion: "system_main_v2.3",
        toneTemplate: "damage_calm_v1",
        inputTokens: 1823,
        outputTokens: 287,
        latencyMs: 1529
      }
    },
    {
      id: "t_9",
      eventType: "post_process",
      ts: ts(2618),
      durationMs: 94,
      payload: {
        citationsAdded: 2,
        forbiddenCheck: "PASSED",
        actionType: "followup",
        finalConfidence: 0.87
      }
    },
    {
      id: "t_10",
      eventType: "response_sent",
      ts: ts(2712),
      durationMs: null,
      payload: { messageId: "m_002" }
    }
  ];
}
