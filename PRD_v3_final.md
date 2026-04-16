# 跨境进口家电 AI 客服 · PRD v3 Final

**版本**：v3.0（最终版，用于指导 AI coding）
**日期**：2026-04-15
**定位**：方法论完整、可演示、可验证的 AI 客服 demo
**读者**：AI 产品经理评审 + AI coding agent（用此文档直接实现代码）

---

## 0. 怎么读这份 PRD

这份 PRD 同时服务两类读者：

- **产品评审**：重点看第 1-5 章（定位、场景、页面）和第 9 章（迭代闭环）
- **AI coding agent**：重点看第 5-14 章（页面结构、模型路由、API 契约、数据模型、可配置项）

**所有需求的优先级用 `[P0]`/`[P1]`/`[P2]` 标注**。`[P0]` 是 MVP 必做，`[P1]` 是完整度需要，`[P2]` 是锦上添花。

**所有写"可配置"的地方**都不得硬编码 — 必须走 `settings` / `experiments` / `model_routes` 等表或后台界面。

---

## 1. 产品定位与核心原则

### 1.1 一句话定位

> 面向**跨境进口家电**场景的 AI 客服系统，通过**可配置的多模型路由 + RAG 唯一真相源 + 人机协同 + A/B 实验迭代**，在保证合规和零误承诺的前提下，最大化自动解决率。

### 1.2 四条不可违反的核心原则

| # | 原则 | 表现 |
|---|------|------|
| **P1** | **RAG 是唯一真相源** | LLM 不能凭内部知识回答业务事实（电压/保修/政策/SKU 兼容）。每条 AI 回答必须引用 ≥1 篇 RAG 文档；检索为空时必须追问或拒答，不得生成。 |
| **P2** | **所有非正常转人工 = Badcase** | 触发人工接管的每一条都进 badcase 池，强制归因到 `RAG_MISS`/`POLICY_UNKNOWN`/`HALLUCINATION`/`TONE_VIOLATION` 之一，并走修复闭环（回写 RAG / 改 prompt / 补 eval）。 |
| **P3** | **高风险场景零容忍误承诺** | B3 退换货 / B6 对抗诱导 / B10 欺诈识别 三大类 rubric 门槛分别 ≥90% / ≥95% / =100%，任一不达标阻塞上线。 |
| **P4** | **可配置性优先于简洁性** | Prompt、检索策略、handoff 阈值、情绪话术、模型路由、SLA、评测门槛等**全部**通过后台界面配置，不写死代码。 |

### 1.3 气质与设计理念

- **美观丝滑**：Inter 字体 + 16px 基准栅格 + 200ms 标准过渡 + 毛玻璃/微阴影 + 流式输出逐字呈现
- **高级靠谱**：每条 AI 回答带引用来源 + 置信度 + 响应时间；所有决策路径可追溯
- **持续迭代**：版本化一切可变项（Prompt v1.3 / Retrieval v2.1 / Route v0.8），A/B 可对照

---

## 2. 用户画像与核心场景

### 2.1 三类用户

| 角色 | 画像 | 核心任务 |
|------|------|---------|
| **C端消费者** | 中国大陆用户，购买欧美/日韩进口家电，客单价 ¥1K–¥50K | 问兼容性、催物流、要退换、破损申诉、情绪投诉 |
| **人工客服（L1-L3）** | 接管 AI 无法处理的案例 | 看 AI 案情摘要、回电、判责、补证据、回写 memory_case |
| **产品/运营** | 迭代 AI 能力 | 看 eval 结果、跑 A/B、改 prompt、补 RAG、分析 badcase |

### 2.2 场景分类（B0-B12，评测覆盖 160 条）

| 代号 | 场景 | 评测条数 | 门槛 |
|------|------|---------|------|
| B0 | 基础场景（兼容/保修/破损综合） | 100 | ≥80% |
| B1 | 中国使用兼容性 | 10 | ≥85% |
| B2 | 带出国使用（含锂电池合规） | 5 | ≥80% |
| **B3** | **退换规则验证** | 8 | **≥90%（阻塞项）** |
| B4 | 运输周期焦虑 | 5 | ≥75% |
| B5 | 进口商 vs 品牌联保 | 6 | ≥85% |
| **B6** | **对抗诱导** | 4 | **≥95%（阻塞项）** |
| B7 | 多轮对话 | 5 | ≥75% |
| B8 | 模糊信息 | 4 | ≥80% |
| B9 | 复合问题 | 4 | ≥75% |
| **B10** | **欺诈风险** | 3 | **=100%（阻塞项）** |
| B11 | 情绪管理 | 4 | ≥80% |
| B12 | 跨渠道 | 2 | ≥80% |

**全局门槛**：加权通过率 ≥82%。B3/B6/B10 任一不达标阻塞上线。

---

## 3. 信息架构与页面清单

### 3.1 顶层导航（四个 tab）

```
[◆ AiServe] [Inbox] [Handoff] [Console] [Knowledge]
```

### 3.2 完整页面清单

| # | 页面 | 路径 | 角色 | 优先级 |
|---|------|------|------|--------|
| 1 | **Inbox 会话+取证一体页** | `/inbox` | 客服 | P0 |
| 2 | **Handoff 人工接管台** | `/handoff` | 主管 | P0 |
| 3 | **Console 运营总览** | `/console` | 产品/运营 | P0 |
| 4 | **A/B Test 实验台** | `/console/experiments` | 产品 | P0 |
| 5 | **Model Routing 模型路由方案** | `/console/models` | 产品 | P0 |
| 6 | **Prompt 版本管理** | `/console/prompts` | 产品 | P1 |
| 7 | **检索策略配置** | `/console/retrieval` | 产品 | P1 |
| 8 | **Handoff 阈值配置** | `/console/handoff-rules` | 产品 | P1 |
| 9 | **情绪话术模板** | `/console/tone-templates` | 产品 | P1 |
| 10 | **Intent Trace 观测页**（按需诊断） | `/trace/:session_id` | 产品/开发 | P0 |
| 11 | **Knowledge RAG 管理** | `/knowledge` | 产品 | P1 |
| 12 | **Badcase 池** | `/console/badcases` | 产品 | P0 |
| 13 | **Eval 评测中心** | `/console/eval` | 产品 | P1 |
| 14 | **设置** | `/console/settings` | 管理员 | P1 |

---

## 4. 设计系统

### 4.1 颜色 Tokens

```css
--bg: #f6f7f9;          /* App 背景 */
--card: #ffffff;         /* 卡片背景 */
--border: #e5e7eb;       /* 边框 */
--border-soft: #f1f2f4;  /* 弱边框 */
--text-1: #0f172a;       /* 主文本 */
--text-2: #475569;       /* 次文本 */
--text-3: #94a3b8;       /* 弱化文本 */
--primary: #4f46e5;      /* 靛蓝主色 */
--primary-50: #eef2ff;
--primary-600: #4338ca;
--success: #059669;  --success-50: #ecfdf5;
--warning: #d97706;  --warning-50: #fffbeb;
--danger:  #dc2626;  --danger-50:  #fef2f2;
--purple:  #a855f7;  --indigo:     #6366f1;
```

### 4.2 字体

- **UI**：Inter（主）+ PingFang SC / 微软雅黑（中文 fallback）
- **代码/ID**：JetBrains Mono
- **基准字号**：13.5px 正文，11-12px 元信息，15-22px 标题

### 4.3 组件库

**技术栈**：Next.js 14 (App Router) + TailwindCSS + shadcn/ui + Radix UI + lucide-react。

**复用的组件**（在 `/components/ui/` 下）：
- `Button` / `IconButton` / `Badge` / `Pill`
- `Card` / `Tabs` / `Table` / `Drawer` / `Modal`
- `Input` / `Textarea` / `Select` / `Combobox` / `Switch` / `Slider`
- `Avatar` / `StatusDot` / `ProgressBar`
- `ChatBubble` / `Composer` / `Timeline` / `Sparkline`
- `ThinkingIndicator`（新，见 5.1）
- `ReasoningTrace`（新，见 5.1）
- `PlanBreakdown`（新，见 5.1）
- `CitationChip`（新，带 tier-1/2/3 徽章）
- `KVList` / `ChecklistItem` / `MetricTile`

### 4.4 通用布局

所有后台页共享：
- 顶栏 52px（品牌 + 4 tabs + 搜索 + 头像）
- 若有二级侧栏：220px
- 主区域：栅格 `max-w-[1440px]` 居中或全屏 responsive

---

## 5. 核心页面详细设计

### 5.1 Inbox 会话+取证一体页 `/inbox` `[P0]`

#### 5.1.1 三栏布局

```
┌─────────────┬──────────────────────────┬─────────────┐
│ Inbox 列表  │ 对话主区                 │ 上下文面板  │
│ 300px       │ flex-1                   │ 380px       │
└─────────────┴──────────────────────────┴─────────────┘
```

#### 5.1.2 左栏：Inbox 列表

- **搜索/筛选**：`AI 处理中` / `待接管` / `高风险` 三 tab
- **会话卡**：头像 + 姓名城市 + 时间 + 最新消息预览 + 标签（SKU/风控/情绪/物流）+ 未读圆点
- **排序**：默认按最后活动时间，支持按 SLA / 优先级切换

#### 5.1.3 中间：对话主区

**Chat Header**
- 客户头像（32px）+ 姓名 + VIP 等级
- 订单号 + 签收状态 + 物流状态（红/黄/绿）
- 右侧：`AI 处理中` 状态 pill + `转接` / `接管` 按钮

**Chat Body**
- 按天分组（day divider）
- 消息气泡：
  - 客户（左、灰白底、边框）
  - AI（右、靛蓝底、白字）
  - 人工客服（右、深绿底，标 `@客服名`）
- 每条 AI 消息底部：`📎 引用源 | 置信度 0.xx | 响应时间 1.4s`
- 点引用 → 侧拉 Drawer 显示完整 RAG 文档

**🆕 AI 思考态 UI（参考 Claude / ChatGPT）**

```tsx
<ThinkingIndicator>
  <span className="dot pulse" />
  <span>AI 正在思考…</span>
  <button onClick={expandReasoning}>展开推理</button>
  <button onClick={interrupt} className="text-danger">打断</button>
</ThinkingIndicator>
```

展开后：
```tsx
<ReasoningTrace collapsed={false}>
  <Step icon="🎯">意图识别：用户询问破损取证流程</Step>
  <Step icon="🔍">检索策略：vector_hybrid@v2.1, top_k=5</Step>
  <Step icon="📚">命中：damage_signoff_sop (tier-1, sim=0.82)</Step>
  <Step icon="🛡">风险检查：通过 (B10 无欺诈信号)</Step>
  <Step icon="✍">生成中… (model=glm-z1-flash)</Step>
</ReasoningTrace>
```

**行为规则**：
- 首次显示"AI 正在思考…"pulse 动画，300ms 后出现第一条 reasoning step
- 每个 step 逐条 append（流式）
- 用户点「打断」→ 立即 abort 请求 + 显示 `已打断，请输入新问题`
- 用户点「展开推理」→ 显示完整 reasoning trace（可折叠）

**🆕 长任务理解+分步回复**

当用户一条消息包含 ≥3 个子问题或 >500 字时，先触发 `PlanBreakdown`：

```tsx
<PlanBreakdown>
  <h4>我理解您一共问了 3 件事，我会逐条回答：</h4>
  <ol>
    <li>☐ 这款 Liebherr 冰箱在中国能否直接使用</li>
    <li>☐ 一年保修覆盖哪些情况</li>
    <li>☐ 运输大概多久能到</li>
  </ol>
  <p className="muted">正在回答第 1 条…</p>
</PlanBreakdown>
```

每完成一条 → check 状态 ✓ 绿色 → 继续下一条。全部完成后收起为一条 summary。

**Composer**（底部输入框）
- Tabs：`回复` / `内部备注` / `转接`
- 输入框支持 `/` 宏命令、`@` 呼叫 AI Copilot、`✨` AI 改写按钮
- 右下：发送按钮
- **可配置**：宏命令列表 / AI 改写 prompt 模板走 `settings.composer_macros`

**AI Copilot 建议卡**（对话流内，虚线靛蓝边框）
- 场景：AI 判断需要转接 / 需要补证据 / 命中风控
- 内容：一句话建议 + 3 个快捷动作按钮（如"生成 handoff_summary"、"一键转 L2"、"冻结 ≤L1 赔付"）

#### 5.1.4 右栏：上下文面板

按从上到下顺序：
1. **风控 Banner**（如有命中）：红底 + 图标 + 信号名 + 描述
2. **客户卡**：姓名 / 等级 / 城市 / 渠道 / 累计消费
3. **订单卡**：订单号 / SKU / 金额 / 签收时间 / 物流状态
4. **本轮检索命中**：最多 5 条 RAG 文档，每条带 tier-1/2/3 徽章
5. **证据清单**：动态 checkbox，已上传打勾，必填缺失红感叹号
6. **下一步动作**：3 个推荐动作按钮（转 L2 / 起草赔付 / 追问补齐）

#### 5.1.5 意图观测入口（按需）

在对话页每条 AI 消息右下角加**「查看处理流程 ↗」**的小链接，点击跳转到 `/trace/:session_id#msg=:msg_id`，而不是主动展开。

这样满足用户"不是每次都想看，遇到问题后才会去点开"的需求。

#### 5.1.6 数据模型

```prisma
model Session {
  id              String   @id @default(cuid())
  customer_id     String
  channel         Channel  // web | wechat | mini_program | app
  status          SessionStatus
  created_at      DateTime
  last_active_at  DateTime
  current_scene   String?  // 当前场景 code (B0/B1/...)
  scene_trace     Json     // 场景迁移历史 [{ts, from, to, trigger}]
  handoff_level   Int?     // 0=AI, 1=L1, 2=L2, 3=L3
  order_id        String?
  risk_signals    String[] // empty_box_claim, duplicate_refund, ...
  messages        Message[]
}

model Message {
  id            String   @id @default(cuid())
  session_id    String
  role          Role     // user | assistant | agent | system | tool
  content       String   @db.Text
  attachments   Json?
  created_at    DateTime
  // AI 相关字段
  model_id      String?  // glm-z1-flash / Qwen2.5-7B / ...
  latency_ms    Int?
  confidence    Float?
  citations     Json?    // [{doc_id, tier, sim_score, snippet}]
  reasoning     Json?    // ReasoningTrace 的结构化数据
  plan          Json?    // PlanBreakdown 的结构化数据
  scene_type    String?  // 本轮判定的场景
  sub_intent    String?
  action_type   String?  // answer | followup | handoff | refuse
  is_interrupted Boolean @default(false)
  session       Session  @relation(fields: [session_id], references: [id])
}

enum Channel { web wechat mini_program app api }
enum SessionStatus { active waiting handoff_requested handed_off closed }
enum Role { user assistant agent system tool }
```

#### 5.1.7 API 契约

```http
POST /api/inbox/sessions/:id/message
Content-Type: application/json
Accept: text/event-stream

{ "content": "...", "attachments": [...] }

# 流式响应（SSE events）
event: plan        { "steps": [...] }           # 若触发 plan breakdown
event: thinking    { "stage": "intent", ... }
event: reasoning   { "step": "retrieval", "hit": [...] }
event: token       { "delta": "这" }
event: token       { "delta": "款" }
event: citation    { "doc_id": "DOC-...", "tier": 1 }
event: done        { "message_id": "...", "latency_ms": 1843 }
event: error       { "code": "...", "message": "..." }

POST /api/inbox/sessions/:id/interrupt
# 中断当前正在生成的 message，返回已生成部分
```

---

### 5.2 Handoff 人工接管台 `/handoff` `[P0]`

#### 5.2.1 三栏布局

```
┌──────────────┬──────────────────────────┬──────────────┐
│ 工单队列     │ 案情详情                 │ 动作面板     │
│ 320px        │ flex-1                   │ 360px        │
└──────────────┴──────────────────────────┴──────────────┘
```

#### 5.2.2 左栏：Escalation Queue

- 筛选：`全部` / `L2` / `L3` / `SLA 超时`
- 每条工单卡：L1/L2/L3 pill + SLA 倒计时 + 案件标题 + 订单号/客户 + 金额 + 风控/情绪标签
- SLA 倒计时 <15 分钟变红

#### 5.2.3 中间：案情详情

**Case Header**：
- 面包屑 `Handoff Queue / L2 / ORD-2026-0019`
- 大标题 + 客户/订单/金额/发起时间/SLA
- 动作按钮：`✓ 接手此案` / `💬 打开对话` / `📞 回拨客户` / `↑ 再升级 L3` / `🚫 驳回转接`

**AI handoff_summary 卡**（靛蓝渐变高亮）：
- 标题：AI 生成的案情摘要
- 关键判断一行
- 摘要段落（含引用文档）
- 3 列 KV：场景迁移路径 / 证据完整度 / AI 推荐动作

**对话时间线**：
- 左侧圆点 timeline，区分客户（红）/ AI（蓝）/ 风控（黄）/ 系统（灰）
- 每条带时间戳 + 耗时（AI 的标模型和响应时间）

**工具调用记录**：
- 3 列卡片：`order_query` / `logistics_query` / `risk_signal`
- 异常的卡红底标识

#### 5.2.4 右栏：动作面板

1. **升级原因**：自动生成的结构化列表（高客单价 / 风控命中 / 证据缺失 / 情绪升温）
2. **主管建议动作**：数字标号列表（回电核对 / 要求补齐 / 判是否升级法务 / 回写 memory_case）
3. **接管备注**：textarea + `保存并接手` 按钮
4. 备注保存后 → 写入 `handoffs.notes` + 触发 badcase 归因流程

#### 5.2.5 数据模型

```prisma
model Handoff {
  id              String   @id @default(cuid())
  session_id      String   @unique
  level           Int      // 1/2/3
  reason          Json     // { high_value: true, risk_hit: [...], evidence_gap: true, emotion: "angry" }
  ai_summary      String   @db.Text  // AI 生成的 handoff_summary
  scene_trace     Json
  evidence_status Json     // { collected: [...], missing: [...] }
  recommended_actions Json
  assigned_to     String?  // agent_id
  sla_deadline    DateTime
  status          HandoffStatus
  notes           String?  @db.Text
  created_at      DateTime
  accepted_at     DateTime?
  resolved_at     DateTime?
  resolution      Json?    // { outcome, refund_issued, ... }
  // 自动转 badcase
  is_badcase      Boolean  @default(true)  // 默认视为 badcase，除非标记 normal
  badcase_id      String?
}

enum HandoffStatus { pending accepted rejected resolved expired }
```

---

### 5.3 Console 运营总览 `/console` `[P0]`

#### 5.3.1 布局

- 顶栏同上
- 二级侧栏 220px：Overview / Experiments / Data / Settings 四组
- 主区：KPI 行 + 趋势图 + 风险门槛表

#### 5.3.2 KPI 卡（4 张）

每张含：指标名 + 图标 + 大数值 + 同比 delta + 迷你 sparkline

- 自动解决率（带 7 天折线）
- 人工接管率
- 风险门槛通过（3/3）
- 评测通过率（含版本号对比）

#### 5.3.3 趋势图

- 双折线 SVG：解决率 / 接管率
- 支持 24h / 7d / 30d / 90d 切换
- 右上角 Legend

#### 5.3.4 风险门槛表

- 6-12 条 rubric 门槛
- 每条：名称 + 阈值（`≥90%`）+ 进度条 + 当前值 + 通过/失败 status pill
- 失败项飘红，可点击跳转到 badcase 归因

**可配置**：门槛阈值走 `eval_gates` 表，后台可调。

---

### 5.4 A/B Test 实验台 `/console/experiments` `[P0]`

#### 5.4.1 实验列表页

- 表格：实验 ID / 名称 / 运行天数 / 分流 / 状态 / 推荐版本 / 操作
- 每行可展开看详情

#### 5.4.2 实验详情页

**Head**：实验名 + 运行天数 + 分流比例 + 会话数 + 操作（日志/暂停/详情）

**变体对比卡**（2 列，胜出者带 RECOMMENDED 徽章+靛蓝渐变底）：
- 变体名 + 分流比例
- 策略简述
- 3 个核心指标（解决率/误承诺/补槽轮次）

**实验维度明细表**：
- 列：实验维度 / Variant A / Variant B / 观察指标 / 胜出
- 每行一个维度（Prompt / 检索 / Handoff 阈值 / 情绪话术 / 模型路由）

**决策建议卡**（底部靛蓝渐变）：
- 推荐版本
- 不推荐切默认的原因（如 "零容忍 > 均值胜出"）
- 后续动作建议

#### 5.4.3 🆕 新建实验（核心能力）

点击 `+ 新建实验` → 侧拉 Drawer 或全屏 Modal：

**Step 1 — 实验元信息**
- 名称 / 目标假设 / 观察指标 / 运行周期

**Step 2 — 变量配置**（多选，可组合）
A/B Test 必须支持配置的变量清单：

| 变量类型 | 可修改项 | 对应页面 |
|---------|---------|---------|
| **Prompt** | system_prompt / user_prompt_template / 少样本示例 | `/console/prompts` 选版本 |
| **检索策略** | top_k / recall_mode (dense/hybrid/rerank) / tier 过滤 / 重排模型 | `/console/retrieval` 选策略 |
| **Handoff 阈值** | emotion_threshold / value_threshold / repeat_threshold | `/console/handoff-rules` |
| **情绪话术模板** | 安抚优先 / 结论优先 / 道歉强度 / 共情深度 | `/console/tone-templates` |
| **模型路由** | 简单/模糊/边界三种场景分别用哪个模型 | `/console/models` 选方案 |
| **Tool 调用策略** | 主动 vs 被动触发工具调用 | `/console/tools` |

每个变量有 Variant A / Variant B 两列下拉，选已有版本或新建。

**Step 3 — 分流与门槛**
- 分流：50/50, 80/20, 95/5 等
- 最小样本量、显著性阈值
- 风险门槛：哪些指标触发自动暂停（如 B10 误承诺 >0 立即停）

**Step 4 — 确认启动**

#### 5.4.4 数据模型

```prisma
model Experiment {
  id            String   @id @default(cuid())
  name          String
  hypothesis    String   @db.Text
  status        ExpStatus
  start_at      DateTime
  end_at        DateTime?
  split_ratio   Json     // {A: 50, B: 50}
  variants      Variant[]
  metrics       Json     // { primary: "resolve_rate", secondary: [...], guardrails: [...] }
  min_sample    Int
  auto_stop     Json     // { false_promise_count: 0, ... }
  result        Json?    // 最终分析
}

model Variant {
  id            String   @id @default(cuid())
  experiment_id String
  label         String   // "A" / "B"
  prompt_version_id    String?
  retrieval_strategy_id String?
  handoff_rules_id     String?
  tone_template_id     String?
  model_route_id       String?
  tool_policy_id       String?
  traffic_pct   Float
  metrics_snapshot Json? // 实时指标
}

enum ExpStatus { draft running paused completed archived }
```

---

### 5.5 🆕 Model Routing 模型路由方案 `/console/models` `[P0]`

这是本次新增的核心模块。

#### 5.5.1 为什么要模型路由

不同场景用不同模型可以**同时优化质量和成本**：
- 简单查询（订单状态、SKU 查询）→ 轻量快速（低延迟 / 零成本）
- 模糊/多轮/推理 → 思考型模型（带 reasoning trace）
- 边界/高风险/合规 → 最强模型（降低误承诺）

#### 5.5.2 页面结构

**顶部**：
- 当前激活方案：`default_route_v1.2` 下拉切换
- 按钮：`+ 新建方案` / `克隆当前` / `导出 JSON`

**主区：可视化路由决策树**

```
                ┌─ 风险等级 ─┐
                │           │
               高           低
                │           │
       ┌────────▼───┐   ┌───▼──────┐
       │ 边界模型    │   │ 意图类型 │
       │ DeepSeek-R1 │   └────┬─────┘
       └────────────┘        │
                 ┌───────────┼────────────┐
               简单         推理         复合
                 │            │           │
           ┌─────▼──┐  ┌─────▼────┐ ┌────▼────┐
           │轻量模型 │  │思考模型   │ │主力模型  │
           │glm-4-  │  │glm-z1-   │ │Qwen2.5- │
           │flash   │  │flash     │ │72B      │
           └────────┘  └──────────┘ └─────────┘
```

决策树每个节点可点击编辑。

**右侧：路由规则表**（可增删改）

| 条件 | 匹配 | 模型 | 备注 |
|------|------|------|------|
| `risk_level == high` | 匹配 B3/B6/B10 | `deepseek-ai/DeepSeek-R1` | 边界零容忍 |
| `intent == 'order_query'` | 订单状态查询 | `glm-4-flash` | 简单查询 |
| `intent == 'compatibility'` + `multi_turn` | 兼容性多轮 | `glm-z1-flash` | 带思考 |
| `scene == 'damage'` + `value > 5000` | 高值破损 | `Qwen/QwQ-32B-Preview` | 推理 |
| `*` | 默认 | `Qwen/Qwen2.5-7B-Instruct` | fallback |

每行可拖拽排序（从上到下匹配，首匹配命中）。

**底部：模型池**

卡片列表展示已接入的模型，每张卡：
- 提供商 logo（智谱 / 硅基流动）
- 模型名 + 大小 + 上下文长度
- 能力标签（`快` / `思考` / `多模态` / `推理` / `长文本`）
- 免费/付费 + 额度
- 当前 QPS / 延迟 / 可用率（mock 数据）
- 操作：`测试` / `详情` / `禁用`

#### 5.5.3 模型接入配置

点击`+ 新增模型` → 表单：

```yaml
name: glm-z1-flash
provider: zhipu | siliconflow | openai | anthropic | custom
base_url: https://open.bigmodel.cn/api/paas/v4   # 可改
api_key_env: ZHIPU_API_KEY                        # 走环境变量
model_id: glm-z1-flash                            # 真正传给 API 的 id
context_window: 32000
supports_streaming: true
supports_reasoning: true                          # 是否有 thinking trace
supports_tools: true
capability_tags: [fast, reasoning, cn_optimized]
cost_per_1k_input: 0           # 免费
cost_per_1k_output: 0
default_temperature: 0.3
timeout_ms: 30000
max_retries: 2
```

#### 5.5.4 场景 → 模型映射

路由决策基于 `(scene_type, sub_intent, risk_level, value_bucket, multi_turn)` 五元组。匹配逻辑：

```ts
function routeModel(ctx: RouteContext, plan: RoutePlan): ModelConfig {
  for (const rule of plan.rules_sorted) {
    if (matchCondition(rule.condition, ctx)) {
      return rule.model;
    }
  }
  return plan.fallback_model;
}
```

**Why 每条可配置**：面试场景不同、模型接入能力会随平台更新，必须后台改不改代码。

#### 5.5.5 默认预设方案（demo 出厂）

**方案 `default_zhipu_v1`**（全走智谱，最容易跑通）：

| 场景 | 模型 |
|------|------|
| 简单查询 | `glm-4-flash` |
| 推理/多轮 | `glm-z1-flash` |
| 边界/高风险 | `glm-4-plus` |
| fallback | `glm-4-flash` |

**方案 `default_siliconflow_v1`**（全走硅基流动，免费额度更足）：

| 场景 | 模型 |
|------|------|
| 简单查询 | `Qwen/Qwen2.5-7B-Instruct` |
| 推理/多轮 | `Qwen/QwQ-32B-Preview` |
| 边界/高风险 | `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B` |
| fallback | `THUDM/glm-4-9b-chat` |

**方案 `default_hybrid_v1`**（混合，推荐 demo 用）：
- 简单查询走智谱 `glm-4-flash`（速度最快）
- 推理走硅基 `Qwen/QwQ-32B-Preview`（免费推理最强）
- 边界走智谱 `glm-4-plus` 或硅基 `DeepSeek-R1`

#### 5.5.6 数据模型

```prisma
model Model {
  id              String   @id @default(cuid())
  name            String   @unique
  provider        ModelProvider
  base_url        String
  api_key_env     String
  model_id        String
  context_window  Int
  supports_streaming Boolean
  supports_reasoning Boolean
  supports_tools  Boolean
  capability_tags String[]
  cost_per_1k_input Float
  cost_per_1k_output Float
  default_temp   Float
  timeout_ms     Int
  max_retries    Int
  enabled        Boolean @default(true)
  created_at     DateTime
}

model RoutePlan {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  is_active   Boolean  @default(false)   // 同时只有 1 个 active
  rules       Json     // 有序规则数组
  fallback_model_id String
  version     String
  created_at  DateTime
  created_by  String?
}

enum ModelProvider { zhipu siliconflow openai anthropic custom }
```

#### 5.5.7 API 契约

```http
# 列出所有模型
GET  /api/models
POST /api/models                # 新增模型
PUT  /api/models/:id            # 更新
POST /api/models/:id/test       # 测试连通性
  body: { "prompt": "你好" }
  resp: { "ok": true, "latency_ms": 312, "output": "..." }

# 路由方案
GET  /api/route-plans
POST /api/route-plans
POST /api/route-plans/:id/activate
POST /api/route-plans/simulate
  body: { "scene_type": "damage", "value": 12000, "risk": "high" }
  resp: { "model": "deepseek-ai/DeepSeek-R1", "matched_rule": "rule_3" }
```

---

### 5.6 Prompt 版本管理 `/console/prompts` `[P1]`

- 列表：系统 prompt 清单（每条有版本号、作者、启用中/历史、测试通过率）
- 详情：
  - Monaco Editor 编辑 + 语法高亮 + 变量占位符提示 `{{customer_name}}` `{{order.id}}`
  - 右栏：预览 + 快速测试（输入 query → 用当前 prompt 跑一次，看回答）
  - 底部：版本历史 + diff 对比
- 操作：保存新版本 / 发布到生产 / 在 A/B 实验里挂载

**数据模型**：
```prisma
model PromptVersion {
  id            String   @id @default(cuid())
  name          String   // 如 "system_main_v2.3"
  slot          PromptSlot  // system | user_template | handoff_summary | tone_angry | ...
  content       String   @db.Text
  variables     Json     // 必填变量声明
  is_active     Boolean  @default(false)
  test_pass_rate Float?
  version       String
  parent_id     String?  // diff 对比用
  created_at    DateTime
  created_by    String?
}
```

---

### 5.7 检索策略配置 `/console/retrieval` `[P1]`

可配置项：

```yaml
name: retrieval_strategy_v2
recall_mode: dense | hybrid | bm25_only
dense_model: bge-m3 | text-embedding-3-small | ...
top_k: 5
rerank_enabled: true
rerank_model: bge-reranker-v2-m3
tier_filter: [tier-1, tier-2]       # 是否只用高信任度
confidence_floor: 0.3
scene_filter: auto                  # 根据意图自动过滤 doc_type
max_context_tokens: 4000
cite_threshold: 0.5                 # 引用最低相似度
```

每个策略可挂载到 A/B 实验。

---

### 5.8 Handoff 阈值配置 `/console/handoff-rules` `[P1]`

配置表格：

| 条件 | 阈值 | 动作 |
|------|------|------|
| `emotion == angry` 连续轮数 | ≥ 2 | 转 L1 |
| `order_value` | > ¥1,000 且误操作 | 转 L2 |
| `risk_signal == empty_box_claim` | hit | 转 L2 + 冻结 ≤L1 赔付 |
| `repeat_same_question` | ≥ 3 次 | 转 L1 |
| `confidence` | < 0.4 | 追问 |
| `confidence` | < 0.2 | 转 L1 |
| `category == B10 fraud` | hit | 转 L3 |
| `category == B6 adversarial` | hit | 强化拒答 + 转 L2 |

每行可增删改，每条规则挂 `enabled` 开关。

---

### 5.9 情绪话术模板 `/console/tone-templates` `[P1]`

模板分类：
- 初级抱怨 → 安抚优先 / 结论优先 / 平衡
- 升级投诉 → 认错 / 解释 / 行动
- 威胁曝光 → 冷静应对 / 不承诺 / 转 L3
- 同情诉求 → 共情 + 实事求是 / 不承诺超能力

每个模板含：
- 名称 + 分类 + 适用场景
- 模板内容（支持变量插值）
- 禁用词清单（从 `gold_must_not_contain` 同步）
- 示例输入输出（3 条）
- 启用/禁用开关

---

### 5.10 🆕 Intent Trace 观测页 `/trace/:session_id` `[P0]`

**用途**：**按需诊断**，不是主动展示。只在用户（PM/开发）遇到问题时点开看。

**入口**：
1. 对话页某条 AI 消息右下角「查看处理流程 ↗」
2. Handoff 页「查看 AI 判断」按钮
3. Badcase 详情「追溯会话」链接
4. 直接访问 URL（面试官追问时可直接定位）

#### 5.10.1 页面结构

**Head**：
- 会话 ID + 客户 + 订单 + 时间
- 按钮：`导出 JSON` / `回到 Inbox`

**时间轴**（垂直，左侧 timeline）
每一步一个卡片，按时间排列：

```
│
●── 14:02:11  用户输入
│   "门板右上角有压痕，外箱看起来没破…"
│   → 意图识别触发
│
●── 14:02:11.243  意图路由
│   intent: damage_report
│   scene_type: damage
│   sub_intent: visible_damage_claim
│   risk_level: medium
│   confidence: 0.89
│   →  匹配规则 rule_damage_mid
│
●── 14:02:11.287  模型选择
│   route_plan: default_hybrid_v1
│   matched_rule: scene == damage && value > 5000
│   model: Qwen/QwQ-32B-Preview (硅基流动)
│   fallback: glm-4-air
│
●── 14:02:11.301  RAG 检索
│   strategy: hybrid_v2.1
│   query_rewrite: "进口冰箱破损取证流程 SOP"
│   top_k=5, hits=[
│     { doc_id: damage_signoff_sop, tier: 1, sim: 0.82 },
│     { doc_id: DOC-IMP-LIEB-BFR-EU-WARRANTY, tier: 1, sim: 0.76 },
│     { doc_id: DOC-PRC-CAT04, tier: 2, sim: 0.61 },
│     ...
│   ]
│   → 2 条 tier-1 文档进入 context
│
●── 14:02:11.412  风险检查
│   signals_checked: [empty_box_claim, duplicate_refund, fraud_keyword]
│   empty_box_claim: HIT (same_address_history)
│   → 触发 block_compensation_below_l2
│
●── 14:02:12.089  工具调用
│   order_query(order_id=ORD-2026-0019)
│     → { status: "delivered", sign_at: "2026-04-12" }
│   logistics_query → { status: "exception_pending_review" }
│   risk_signal_check → { signals: ["empty_box_claim:high"] }
│
●── 14:02:12.234  模型生成
│   prompt_version: system_main_v2.3
│   tone_template: damage_calm_v1
│   handoff_rules: default_v1
│   input_tokens: 1823
│   → 流式输出
│     14:02:12.567  "您好"
│     14:02:12.634  "，可以"
│     ...
│   output_tokens: 287
│   latency: 1.4s
│
●── 14:02:13.618  后处理
│   citations_added: 2
│   forbidden_check: PASSED
│   action_type: followup
│   final_confidence: 0.87
│
●── 14:02:13.712  发送给用户
```

每个卡片可**折叠/展开**，默认折叠关键字段。

#### 5.10.2 侧边筛选

- 事件类型：路由 / 检索 / 工具 / 模型 / 风险 / 后处理
- 时间范围
- 错误/异常事件飘红

#### 5.10.3 数据模型

```prisma
model TraceEvent {
  id          String   @id @default(cuid())
  session_id  String
  message_id  String?
  event_type  TraceType
  ts          DateTime
  duration_ms Int?
  payload     Json     // 结构化内容，按 event_type 不同而不同
  is_error    Boolean  @default(false)
}

enum TraceType {
  user_input
  intent_classify
  model_route
  rag_retrieve
  risk_check
  tool_call
  model_generate
  post_process
  response_sent
  interrupt
  handoff
}
```

---

### 5.11 Knowledge RAG 管理 `/knowledge` `[P1]`

- 文档列表（310 条），带筛选：`doc_type` / `tier` / `domain` / `sku`
- 每条文档：id / title / tier 徽章 / confidence_ceiling / 是否 replace_with_real_doc
- 操作：查看 / 编辑 / 升降 tier / 替换真实文档 / 下线
- 底部：上传批次 CSV / JSONL + 重建索引按钮
- 右侧：统计面板（按 tier 分布 / doc_type 分布 / 更新时间分布）

**关键能力**：
- 一键"替换为真实文档"：从 `replace_with_real_doc=true` 的 synthetic 文档挑出，引导 PM 上传真实内容
- 检索调试器：输入 query 看当前检索策略下会命中哪些

---

### 5.12 Badcase 池 `/console/badcases` `[P0]`

#### 5.12.1 列表页

筛选：归因类型 / 场景 B0-B12 / 修复状态 / 时间

每行：case id / 场景 / 归因 / 严重度 / 发现时间 / 修复状态 / SLA / 操作

#### 5.12.2 详情页

- 原始会话回放（跳 trace 页）
- AI 输出 vs Gold Rule（对比高亮）
- 归因分析：
  - `RAG_MISS` → 列出本应命中但没命中的文档
  - `POLICY_UNKNOWN` → 指出缺失的业务规则
  - `HALLUCINATION` → 对比 RAG 文档 & AI 输出差异
  - `TONE_VIOLATION` → 高亮违反 tone 规则的片段
- 修复动作清单：
  - [ ] 补 RAG 文档
  - [ ] 更新 Prompt v
  - [ ] 加入 eval 候选池
  - [ ] 调整 handoff 阈值
  - [ ] 联系运营核对业务规则
- 每项有修复 SLA（`RAG_MISS` 48h / `HALLUCINATION` 24h P0 / `TONE` 72h）

#### 5.12.3 自动归因

新 handoff 进来后，后端自动跑归因脚本：
1. 取该会话最后 AI 输出 + 检索结果 + gold_rule（如匹配到某条 eval）
2. 跑分类器或 LLM 评判 → 打上归因 label
3. 不确定时标 `unclassified` 进人工复审队列

#### 5.12.4 数据模型

```prisma
model Badcase {
  id                String   @id @default(cuid())
  session_id        String
  handoff_id        String?
  scene_code        String   // B0/B1/.../B12
  attribution       Attribution
  severity          Severity
  ai_output         String   @db.Text
  gold_rule         Json?
  diff              Json?    // 高亮片段
  status            BadcaseStatus
  sla_deadline      DateTime
  fix_actions       Json     // [{type, status, note}]
  discovered_at     DateTime
  fixed_at          DateTime?
  reviewer          String?
}

enum Attribution { RAG_MISS POLICY_UNKNOWN HALLUCINATION TONE_VIOLATION MIXED UNCLASSIFIED }
enum Severity { P0 P1 P2 }
enum BadcaseStatus { open in_review in_fix verifying closed reopened }
```

---

### 5.13 Eval 评测中心 `/console/eval` `[P1]`

- Eval 集管理：160 条（v2_expanded）+ 补充集
- 跑 eval 任务：选模型 + 选 prompt + 选检索策略 → 一键运行
- 结果看板：总分 / 类别通过率 / rubric 门槛状态 / Badcase 分布
- 版本对比：v1 → v2 → v3 的通过率曲线
- 导出 `eval_run_vN_report.md`

---

### 5.14 设置 `/console/settings` `[P1]`

全局配置项（可增删改）：
- API Keys（环境变量管理，显示 masked）
- SLA 设置（L1/L2/L3 分别的 SLA 分钟数）
- 告警渠道（邮件/Webhook）
- 数据保留周期
- 默认 locale
- 特性开关（`feature_flags`）

---

## 6. 模型接入与路由（智谱 + 硅基流动）

### 6.1 统一 Provider 抽象

```ts
// /lib/llm/provider.ts
export interface LLMProvider {
  name: string;
  chat(params: ChatParams): AsyncIterable<ChatEvent>;
  isHealthy(): Promise<boolean>;
}

export interface ChatParams {
  model: string;
  messages: Message[];
  temperature?: number;
  max_tokens?: number;
  tools?: Tool[];
  stream: true;
  reasoning?: boolean;  // 触发 thinking trace
}

export type ChatEvent =
  | { type: 'thinking'; stage: string; detail?: any }
  | { type: 'reasoning'; step: string; content: string }
  | { type: 'token'; delta: string }
  | { type: 'tool_call'; name: string; args: any }
  | { type: 'done'; usage: Usage }
  | { type: 'error'; error: Error };
```

### 6.2 智谱 Provider

```ts
// /lib/llm/providers/zhipu.ts
const ZHIPU_BASE = process.env.ZHIPU_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4';

export class ZhipuProvider implements LLMProvider {
  name = 'zhipu';

  async *chat(params: ChatParams) {
    const res = await fetch(`${ZHIPU_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ZHIPU_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        stream: true,
        temperature: params.temperature ?? 0.3,
        tools: params.tools,
      }),
    });

    // SSE 解析 → yield ChatEvent
    // 对 glm-z1-* 模型，解析 <think>...</think> 段落 → reasoning events
  }
}
```

### 6.3 硅基流动 Provider

```ts
// /lib/llm/providers/siliconflow.ts
const SF_BASE = process.env.SILICONFLOW_BASE_URL ?? 'https://api.siliconflow.cn/v1';
// 完全 OpenAI 兼容，直接用 OpenAI SDK，换 base_url 即可
```

### 6.4 Router

```ts
// /lib/llm/router.ts
export async function route(ctx: RouteContext): Promise<ModelConfig> {
  const plan = await db.routePlan.findFirst({ where: { is_active: true } });
  for (const rule of plan.rules) {
    if (matchCondition(rule.condition, ctx)) {
      const model = await db.model.findUnique({ where: { id: rule.model_id } });
      if (!model.enabled) continue;
      return model;
    }
  }
  return db.model.findUnique({ where: { id: plan.fallback_model_id } });
}
```

### 6.5 环境变量

```dotenv
# .env.local
ZHIPU_API_KEY=xxx
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4

SILICONFLOW_API_KEY=xxx
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1

# 可选
OPENAI_API_KEY=xxx
ANTHROPIC_API_KEY=xxx

# 向量库
EMBED_PROVIDER=siliconflow    # zhipu | siliconflow | openai
EMBED_MODEL=BAAI/bge-m3
VECTOR_STORE=faiss            # faiss | pgvector | qdrant
```

---

## 7. RAG 检索与信任度

### 7.1 四级信任度（`source_of_truth_tier`）

| Tier | 含义 | confidence_ceiling | 举例 |
|------|------|-------------------|------|
| tier-1 | 品牌/官方/法规权威 | 1.0 | 产品说明书、官方售后政策、海关规定 |
| tier-2 | 进口商自己维护的规则 | 0.85 | 内部 SOP、赔付级别表 |
| tier-3 | 运营经验/高频 QA | 0.65 | 客服经验库 |
| tier-4 | synthetic / 推断 | 0.4 | 生成的示例文档（需替换） |

### 7.2 检索流程

```
1. query rewrite (可选, 默认开启)
2. embedding → 向量检索 (faiss/pgvector) top_n (默认 20)
3. BM25 重排（hybrid 模式）
4. reranker（bge-reranker-v2-m3）取 top_k=5
5. tier 过滤（可配置，默认保留 tier 1/2）
6. confidence_floor 过滤
7. 场景过滤（按 intent 自动过滤 doc_type）
```

### 7.3 生成约束

- 生成前检查 `retrieved.length >= 1`，否则走拒答话术
- 每段事实陈述必须对应 ≥1 个 citation
- `confidence_ceiling` 会作为软约束写进 prompt：_"下列参考材料的最高可信度 = {{ceiling}}，回答请标注不确定性"_

---

## 8. A/B Test 实验引擎

### 8.1 分流

- 分流键：`session.customer_id` → MD5 → mod 100
- 保证同一 customer 在一次实验内稳定分到同一 variant
- 支持 `holdout_pct` 保持对照组

### 8.2 指标

- 主指标：`resolve_rate` / `handoff_rate` / `csat`（mock）
- 守护指标：`false_promise_count`（B3/B6/B10 误承诺，阈值 =0）
- 次指标：`avg_slot_fill_turns` / `retrieval_miss_rate` / `avg_latency_ms` / `cost_per_session`

### 8.3 自动停止

若守护指标触发阈值（如 B10 误承诺 >0），自动把变体从 50/50 切到 0/100（保 A），并通知 PM。

### 8.4 结果分析

- 显著性：bootstrap 或 chi-square（按指标类型）
- 推荐版本的判定：**所有守护指标通过** + **主指标胜出或不显著**

---

## 9. Badcase 迭代闭环

```
[Handoff 发生]
    ↓  自动
[标记 is_badcase=true (默认), 进 badcase 池]
    ↓  自动归因
[attribution: RAG_MISS | POLICY_UNKNOWN | HALLUCINATION | TONE_VIOLATION]
    ↓  分发
┌───────────────┬─────────────────┬────────────────┬───────────────┐
│ RAG_MISS      │ POLICY_UNKNOWN  │ HALLUCINATION  │ TONE_VIOLATION│
│ 48h 补文档    │ 48h 补规则+prompt│ 24h 修 (P0)    │ 72h 调 tone    │
└───────────────┴─────────────────┴────────────────┴───────────────┘
    ↓  修复验证
[回写 RAG / 更新 Prompt 版本 / 加进 eval 候选 / 调 handoff 阈值]
    ↓
[下次跑 eval 验证 → fixed → 关闭]
```

**UI 层支持**：
- Badcase 详情页每个修复动作有责任人 + SLA + 状态
- 完成后自动关联到下一次 eval run 的对比数据
- 所有 badcase 形成"迭代历史"可在 Console 看趋势

---

## 10. 技术架构

### 10.1 技术栈

```
前端：Next.js 14 (App Router) + TypeScript
      + TailwindCSS + shadcn/ui + Radix UI
      + lucide-react (图标)
      + SWR (数据请求) + Zustand (客户端状态)
      + Monaco Editor (prompt 编辑)
      + React Flow (路由可视化 decision tree)
      + Recharts / 纯 SVG (图表)

后端：Next.js API Routes + Prisma + PostgreSQL
      + Redis (缓存/队列)
      + FAISS 或 pgvector (向量检索)

LLM：   OpenAI 兼容 SDK (统一接 Zhipu/SiliconFlow)
        自写 Provider 抽象层

流式：  Server-Sent Events (SSE) + ReadableStream
```

### 10.2 目录结构

```
/
├─ app/                          # Next.js App Router
│  ├─ (public)/                  # 公开页面
│  ├─ inbox/
│  ├─ handoff/
│  ├─ console/
│  │  ├─ page.tsx               # Overview
│  │  ├─ experiments/
│  │  ├─ models/
│  │  ├─ prompts/
│  │  ├─ retrieval/
│  │  ├─ handoff-rules/
│  │  ├─ tone-templates/
│  │  ├─ badcases/
│  │  ├─ eval/
│  │  └─ settings/
│  ├─ knowledge/
│  ├─ trace/[session_id]/
│  └─ api/
│     ├─ inbox/
│     ├─ handoff/
│     ├─ models/
│     ├─ route-plans/
│     ├─ experiments/
│     ├─ badcases/
│     └─ ...
├─ components/
│  ├─ ui/                        # shadcn 基础组件
│  ├─ chat/
│  │  ├─ ChatBubble.tsx
│  │  ├─ Composer.tsx
│  │  ├─ ThinkingIndicator.tsx
│  │  ├─ ReasoningTrace.tsx
│  │  └─ PlanBreakdown.tsx
│  ├─ citation/
│  ├─ timeline/
│  └─ charts/
├─ lib/
│  ├─ llm/
│  │  ├─ provider.ts
│  │  ├─ providers/zhipu.ts
│  │  ├─ providers/siliconflow.ts
│  │  ├─ router.ts
│  │  └─ stream.ts
│  ├─ rag/
│  │  ├─ embedding.ts
│  │  ├─ retrieve.ts
│  │  └─ rerank.ts
│  ├─ intent/
│  │  └─ classify.ts
│  ├─ risk/
│  │  └─ signals.ts
│  ├─ tools/
│  │  ├─ order_query.ts
│  │  ├─ logistics_query.ts
│  │  └─ refund_draft.ts
│  ├─ trace/
│  │  └─ emit.ts                 # 统一写 trace event
│  └─ badcase/
│     └─ attribute.ts
├─ prisma/
│  └─ schema.prisma
├─ scripts/
│  ├─ seed-loader.ts             # 已有
│  ├─ build-index.ts             # 建 faiss
│  └─ run-eval.ts                # 跑评测
└─ mock_ui/                      # 现有 3 个静态 HTML mock
```

### 10.3 关键流程：一次消息的生命周期

```
POST /api/inbox/sessions/:id/message
  ↓
[1] 写入 user message to DB
  ↓
[2] emit trace: user_input
  ↓
[3] intent classify (轻量模型或规则)
  ↓ ctx: { intent, scene_type, sub_intent, risk_level, value_bucket, multi_turn }
[4] emit trace: intent_classify
  ↓
[5] LLM Router 选模型
  ↓
[6] emit trace: model_route
  ↓
[7] 检查是否需要 PlanBreakdown
     (len > 500 或 检测到 ≥3 子问题)
  ↓
[8] RAG 检索 → top_k
  ↓
[9] emit trace: rag_retrieve
  ↓
[10] 风险检查 (signals)
  ↓
[11] emit trace: risk_check
  ↓
[12] 若需要调工具 (order_query/...) → tool call
  ↓
[13] emit trace: tool_call * N
  ↓
[14] 组装 prompt (sys_prompt_version + tone_template + citations + tools_output)
  ↓
[15] LLM.chat(stream=true) → 逐 event 转发给前端 SSE
     - thinking / reasoning (若支持)
     - token 流式
     - tool_call 可中间插入
  ↓
[16] emit trace: model_generate (含 tokens, latency)
  ↓
[17] 后处理：citation 抽取 / 禁用词检查 / confidence 计算
  ↓
[18] emit trace: post_process
  ↓
[19] 写入 assistant message to DB
  ↓
[20] 若 action_type == 'handoff' → 自动创建 Handoff + 标 badcase
  ↓
[21] emit trace: response_sent
  ↓
[22] SSE done event
```

**中断**：
- 前端 AbortController → POST /interrupt
- 后端收到后 abort LLM 请求 + 写 `messages.is_interrupted=true` + emit trace `interrupt`

---

## 11. 数据模型（完整 Prisma schema 骨架）

```prisma
// prisma/schema.prisma
generator client { provider = "prisma-client-js" }
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Customer {
  id         String   @id @default(cuid())
  name       String
  level      String   // VIP/normal
  city       String?
  channel    Channel
  total_spent Float   @default(0)
  sessions   Session[]
  orders     Order[]
}

model Order {
  id             String   @id
  customer_id    String
  sku_id         String
  amount         Float
  status         OrderStatus
  signed_at      DateTime?
  logistics      Logistics?
  customer       Customer @relation(fields: [customer_id], references: [id])
}

model Logistics {
  order_id   String   @id
  tracking_no String
  status     LogisticsStatus
  last_node  String?
  last_update DateTime?
  order      Order @relation(fields: [order_id], references: [id])
}

model Session {
  id              String   @id @default(cuid())
  customer_id     String
  channel         Channel
  status          SessionStatus
  created_at      DateTime @default(now())
  last_active_at  DateTime @default(now())
  current_scene   String?
  scene_trace     Json     @default("[]")
  handoff_level   Int?
  order_id        String?
  risk_signals    String[] @default([])
  experiment_assignments Json @default("{}")  // { "exp_id": "A" }
  customer        Customer @relation(fields: [customer_id], references: [id])
  messages        Message[]
  traces          TraceEvent[]
  handoff         Handoff?
  @@index([status, last_active_at])
  @@index([customer_id])
}

model Message {
  id             String   @id @default(cuid())
  session_id     String
  role           Role
  content        String   @db.Text
  attachments    Json?
  created_at     DateTime @default(now())
  model_id       String?
  latency_ms     Int?
  confidence     Float?
  citations      Json?
  reasoning      Json?
  plan           Json?
  scene_type     String?
  sub_intent     String?
  action_type    String?
  tool_calls     Json?
  is_interrupted Boolean  @default(false)
  session        Session  @relation(fields: [session_id], references: [id])
  @@index([session_id, created_at])
}

model TraceEvent {
  id          String   @id @default(cuid())
  session_id  String
  message_id  String?
  event_type  TraceType
  ts          DateTime @default(now())
  duration_ms Int?
  payload     Json
  is_error    Boolean  @default(false)
  session     Session  @relation(fields: [session_id], references: [id])
  @@index([session_id, ts])
  @@index([event_type])
}

model Handoff {
  id                  String   @id @default(cuid())
  session_id          String   @unique
  level               Int
  reason              Json
  ai_summary          String   @db.Text
  scene_trace         Json
  evidence_status     Json
  recommended_actions Json
  assigned_to         String?
  sla_deadline        DateTime
  status              HandoffStatus
  notes               String?  @db.Text
  created_at          DateTime @default(now())
  accepted_at         DateTime?
  resolved_at         DateTime?
  resolution          Json?
  is_badcase          Boolean  @default(true)
  badcase             Badcase?
  session             Session  @relation(fields: [session_id], references: [id])
}

model Badcase {
  id                String   @id @default(cuid())
  session_id        String
  handoff_id        String?  @unique
  scene_code        String
  attribution       Attribution
  severity          Severity
  ai_output         String   @db.Text
  gold_rule         Json?
  diff              Json?
  status            BadcaseStatus
  sla_deadline      DateTime
  fix_actions       Json     @default("[]")
  discovered_at     DateTime @default(now())
  fixed_at          DateTime?
  reviewer          String?
  handoff           Handoff? @relation(fields: [handoff_id], references: [id])
}

model RagDoc {
  id                      String   @id
  doc_type                String
  domain                  String
  title                   String
  content                 String   @db.Text
  brand                   String?
  category                String?
  sku_id                  String?
  version_country         String?
  sales_regions           String[]
  supported_use_countries String[]
  warranty_scope_type     String?
  priority_topics         String[]
  source_type             String
  source_of_truth_tier    Int
  confidence_ceiling      Float
  subject_risk_level      String
  data_risk_level         String
  locale                  String
  version                 String
  expires_at              DateTime?
  replace_with_real_doc   Boolean  @default(false)
  embedding               Float[]?
  @@index([doc_type, source_of_truth_tier])
  @@index([sku_id])
}

model Model {
  id              String   @id @default(cuid())
  name            String   @unique
  provider        ModelProvider
  base_url        String
  api_key_env     String
  model_id        String
  context_window  Int
  supports_streaming Boolean @default(true)
  supports_reasoning Boolean @default(false)
  supports_tools  Boolean @default(true)
  capability_tags String[]
  cost_per_1k_input Float @default(0)
  cost_per_1k_output Float @default(0)
  default_temp    Float @default(0.3)
  timeout_ms      Int @default(30000)
  max_retries     Int @default(2)
  enabled         Boolean @default(true)
  created_at      DateTime @default(now())
}

model RoutePlan {
  id                 String   @id @default(cuid())
  name               String   @unique
  description        String?
  is_active          Boolean  @default(false)
  rules              Json     // [{condition: {...}, model_id: "..."}]
  fallback_model_id  String
  version            String
  created_at         DateTime @default(now())
  created_by         String?
}

model PromptVersion {
  id             String   @id @default(cuid())
  name           String
  slot           PromptSlot
  content        String   @db.Text
  variables      Json     @default("[]")
  is_active      Boolean  @default(false)
  test_pass_rate Float?
  version        String
  parent_id      String?
  created_at     DateTime @default(now())
  created_by     String?
  @@unique([name, version])
}

model RetrievalStrategy {
  id              String   @id @default(cuid())
  name            String   @unique
  recall_mode     String
  dense_model     String
  top_k           Int
  rerank_enabled  Boolean
  rerank_model    String?
  tier_filter     Int[]
  confidence_floor Float
  max_context_tokens Int
  cite_threshold  Float
  is_active       Boolean  @default(false)
  version         String
}

model HandoffRule {
  id          String  @id @default(cuid())
  name        String
  condition   Json    // { field: "emotion", op: ">=", value: "angry", consecutive: 2 }
  action      String  // escalate_l1 | escalate_l2 | refuse | ...
  extra       Json?   // { freeze_compensation_below: "L2", ... }
  enabled     Boolean @default(true)
  priority    Int     // sort order
  version     String
}

model ToneTemplate {
  id            String  @id @default(cuid())
  name          String
  category      String  // damage / angry / threat / sympathy / ...
  content       String  @db.Text
  forbidden_words String[]
  examples      Json    // [{in, out}]
  enabled       Boolean @default(true)
  version       String
}

model Experiment {
  id          String   @id @default(cuid())
  name        String
  hypothesis  String   @db.Text
  status      ExpStatus
  start_at    DateTime
  end_at      DateTime?
  split_ratio Json
  variants    Variant[]
  metrics     Json
  min_sample  Int
  auto_stop   Json
  result      Json?
  created_at  DateTime @default(now())
}

model Variant {
  id                     String   @id @default(cuid())
  experiment_id          String
  label                  String   // "A" / "B"
  prompt_version_id      String?
  retrieval_strategy_id  String?
  handoff_rules_id       String?
  tone_template_id       String?
  model_route_id         String?
  tool_policy_id         String?
  traffic_pct            Float
  metrics_snapshot       Json?
  experiment             Experiment @relation(fields: [experiment_id], references: [id])
}

model EvalRun {
  id              String   @id @default(cuid())
  name            String
  eval_set_id     String   // 指向评测集
  prompt_version_id String?
  retrieval_strategy_id String?
  model_route_id  String?
  started_at      DateTime @default(now())
  finished_at     DateTime?
  total           Int
  passed          Int
  by_category     Json     // { B0: {pass: 85, total: 100}, ... }
  gate_pass       Json     // { B3: true, B6: true, B10: true, ... }
  badcases_created Int @default(0)
  report_md       String?  @db.Text
}

enum Channel { web wechat mini_program app api }
enum SessionStatus { active waiting handoff_requested handed_off closed }
enum Role { user assistant agent system tool }
enum TraceType {
  user_input
  intent_classify
  model_route
  rag_retrieve
  risk_check
  tool_call
  model_generate
  post_process
  response_sent
  interrupt
  handoff
}
enum OrderStatus { paid shipped delivered returned refunded }
enum LogisticsStatus { pending in_transit customs_clearing exception delivered }
enum HandoffStatus { pending accepted rejected resolved expired }
enum Attribution { RAG_MISS POLICY_UNKNOWN HALLUCINATION TONE_VIOLATION MIXED UNCLASSIFIED }
enum Severity { P0 P1 P2 }
enum BadcaseStatus { open in_review in_fix verifying closed reopened }
enum ModelProvider { zhipu siliconflow openai anthropic custom }
enum PromptSlot {
  system_main
  user_template
  handoff_summary
  tone_angry
  tone_damage
  tone_threat
  tone_sympathy
  refuse_template
  plan_breakdown
  intent_classify
}
enum ExpStatus { draft running paused completed archived }
```

---

## 12. API 契约

### 12.1 Inbox

```
GET  /api/inbox/sessions                    list
GET  /api/inbox/sessions/:id                detail
POST /api/inbox/sessions/:id/message        send (SSE stream)
POST /api/inbox/sessions/:id/interrupt      interrupt current generation
POST /api/inbox/sessions/:id/takeover       agent takeover
POST /api/inbox/sessions/:id/transfer       transfer to another agent
```

### 12.2 Handoff

```
GET  /api/handoff/queue                     queue list
GET  /api/handoff/:id                       detail
POST /api/handoff/:id/accept                agent accept
POST /api/handoff/:id/reject                reject back to AI or another agent
POST /api/handoff/:id/resolve               close with resolution
```

### 12.3 Model Routing

```
GET  /api/models
POST /api/models
PUT  /api/models/:id
POST /api/models/:id/test

GET  /api/route-plans
POST /api/route-plans
POST /api/route-plans/:id/activate
POST /api/route-plans/simulate
```

### 12.4 Experiments

```
GET  /api/experiments
POST /api/experiments
PUT  /api/experiments/:id
POST /api/experiments/:id/start
POST /api/experiments/:id/pause
POST /api/experiments/:id/complete
GET  /api/experiments/:id/results
```

### 12.5 Trace

```
GET  /api/trace/:session_id                 全部事件
GET  /api/trace/:session_id?message_id=x    某条消息相关
POST /api/trace/:session_id/export          导出 JSON
```

### 12.6 Badcases

```
GET  /api/badcases?attribution=RAG_MISS&status=open
GET  /api/badcases/:id
POST /api/badcases/:id/attribute            手动归因
POST /api/badcases/:id/fix                  登记修复动作
POST /api/badcases/:id/close                关闭
```

### 12.7 Eval

```
POST /api/eval/runs
  body: { eval_set_id, prompt_version_id, retrieval_strategy_id, model_route_id }
GET  /api/eval/runs/:id
GET  /api/eval/runs/:id/report
```

### 12.8 其他配置

```
# 通用 CRUD，按 /api/prompts, /api/retrieval-strategies, /api/handoff-rules,
# /api/tone-templates, /api/rag-docs, /api/settings
```

---

## 13. 可配置性清单（settings.json 或 DB）

以下所有配置**必须**走后台界面或环境变量，不得写死：

| 配置项 | 默认值 | 来源 | 影响 |
|--------|-------|------|------|
| `retrieval.top_k` | 5 | DB | 检索深度 |
| `retrieval.tier_filter` | [1, 2] | DB | 只用高信任度文档 |
| `retrieval.confidence_floor` | 0.3 | DB | 低相似度不入 context |
| `handoff.emotion_threshold_consecutive` | 2 | DB | 几轮 angry 后转人工 |
| `handoff.value_threshold` | 1000 | DB | 高值订单手工阈值 |
| `handoff.confidence_floor` | 0.4 | DB | 低置信度追问 |
| `handoff.sla_l1_minutes` | 30 | DB | L1 SLA |
| `handoff.sla_l2_minutes` | 60 | DB | L2 SLA |
| `eval.global_gate` | 82 | DB | 全局通过率门槛 |
| `eval.b3_gate` | 90 | DB | 退换规则门槛 |
| `eval.b6_gate` | 95 | DB | 对抗诱导门槛 |
| `eval.b10_gate` | 100 | DB | 欺诈识别门槛 |
| `model.default_temp` | 0.3 | DB | 默认温度 |
| `model.timeout_ms` | 30000 | DB | 默认超时 |
| `ui.thinking_indicator_delay_ms` | 300 | DB | 思考指示器出现延迟 |
| `ui.plan_breakdown_trigger_len` | 500 | DB | 触发 plan 的最短字数 |
| `ui.plan_breakdown_trigger_questions` | 3 | DB | 触发 plan 的子问题数 |
| `ui.stream_chunk_delay_ms` | 30 | DB | 流式字符显示间隔 |
| `badcase.auto_attribute` | true | DB | 自动归因开关 |
| `badcase.sla_rag_miss_h` | 48 | DB | |
| `badcase.sla_hallucination_h` | 24 | DB | P0 |
| `badcase.sla_tone_h` | 72 | DB | |
| `ab.auto_stop_on_false_promise` | true | DB | 守护指标自动停 |
| `feature.model_routing` | true | DB | |
| `feature.reasoning_trace` | true | DB | |
| `feature.plan_breakdown` | true | DB | |
| `feature.interrupt` | true | DB | |

---

## 14. 非功能需求

### 14.1 性能

- 首 token 延迟（TTFT）< 2s（P95）
- 流式完成总延迟 < 10s（简单查询），< 20s（推理任务）
- 页面首屏 LCP < 2.5s
- 支持 ≥50 并发会话（demo 级）

### 14.2 可观测性

- 所有 trace event 必须落库（可关，但默认开）
- 指标：TTFT / TPS / 命中率 / 错误率，通过 Console 可视化
- 日志：关键决策点结构化日志

### 14.3 安全

- API Keys 通过环境变量，前端不暴露
- 敏感字段（phone、地址）脱敏显示
- 操作审计：谁改了 prompt / 路由方案 / 阈值，必须记录 `created_by` + `audit_log`

### 14.4 国际化

- UI 语言：zh-CN 为主，留 i18n 钩子
- 时间：默认东八区，可切
- 货币：CNY 默认

### 14.5 可访问性

- 键盘导航：`⌘K` 搜索 / `J/K` 上下选会话 / `Enter` 打开
- 色彩对比度 ≥ AA
- 所有交互元素有 aria-label

---

## 15. 验收标准（MVP）

### 15.1 功能验收

- [ ] 一条消息完整走通 `intent → route → retrieve → generate → citation` 全流程
- [ ] 流式显示 + 思考态 + 可展开 reasoning + 可打断
- [ ] 长消息触发 plan breakdown 分步回答
- [ ] RAG 未命中时走拒答话术，不凭空生成
- [ ] 满足阈值自动创建 Handoff + 写入 Badcase
- [ ] Model Routing 可视化 decision tree 可编辑
- [ ] 至少支持智谱 + 硅基流动两个 provider，可切换
- [ ] A/B Test 可配置 prompt/retrieval/handoff/tone/model 5 种变量
- [ ] Trace 页完整记录一条消息的处理路径

### 15.2 质量验收

- [ ] 跑一次 160 条 eval → 通过率 ≥82%，B3/B6/B10 全过门槛
- [ ] 首 token 延迟 < 2s（P95）
- [ ] 所有页面在 1440px / 1280px / 1024px 下布局正确
- [ ] 亮/暗模式兼容（MVP 仅亮，留 tokens）

### 15.3 Demo 脚本

面试时按此顺序演示（**MUST WORK**）：
1. **Inbox 基础流程**：发一条"这台 Liebherr 在中国能用吗" → 看 thinking / reasoning / citation / plan 全链路
2. **中断**：发一条长 query → 点打断 → 立即停
3. **Handoff**：触发破损场景 → 自动转 L2 → 看 handoff_summary
4. **Model Routing**：切到另一个路由方案 → 同样 query 命中不同模型
5. **A/B Test**：查看已运行实验 → 理解 winner 决策
6. **Trace**：点某条消息的「查看处理流程」→ 看完整时间轴
7. **Badcase**：查看近期 badcase → 看归因分布

---

## 附录 A. 开发路线（AI coding agent 参考）

### Phase 1 — 骨架（优先级最高）
1. Prisma schema + migration
2. seed-loader 对接现有 RAG jsonl / CSV（复用 scripts/seed-loader.ts）
3. LLM Provider 抽象 + Zhipu + SiliconFlow 两个实现
4. 基础路由引擎（先支持硬编码规则，再做可视化）
5. Inbox 页面：3 栏静态布局 + 消息列表 + 基础 composer
6. 消息发送 SSE：打通 intent → retrieve → model → stream → citation

### Phase 2 — 交互体验（P0）
7. ThinkingIndicator + ReasoningTrace + 可打断
8. PlanBreakdown 长任务分解
9. Handoff 自动创建 + 工作台页
10. Trace 记录全链路 + Trace 页可视化

### Phase 3 — 配置化（P0）
11. Model Routing 管理页 + Decision Tree 可视化（React Flow）
12. 新建实验 Modal（5 种变量选择）
13. Experiments 详情页 + 指标计算
14. Prompt / Retrieval / Handoff Rules / Tone Template 管理页

### Phase 4 — 闭环（P1）
15. Badcase 自动归因 + 池子页
16. Eval 中心 + run-eval.ts 可跑
17. Console 总览 + 风险门槛表

### Phase 5 — 打磨（P2）
18. Knowledge 管理完整 CRUD
19. Settings 页
20. 键盘快捷键 / Command Palette

---

## 附录 B. 关键字段枚举速查

**scene_type（即 `category`）**：`B0` / `B1`（中国使用）/ `B2`（带出国）/ `B3`（退换）/ `B4`（运输）/ `B5`（进口保修）/ `B6`（对抗）/ `B7`（多轮）/ `B8`（模糊）/ `B9`（复合）/ `B10`（欺诈）/ `B11`（情绪）/ `B12`（跨渠道）

**action_type**：`answer` / `followup` / `handoff` / `refuse` / `tool_call_pending`

**risk_level**：`low` / `medium` / `high` / `critical`

**risk_signals**（多选）：`empty_box_claim` / `duplicate_refund` / `fraud_keyword` / `address_cluster` / `time_inconsistency` / `signature_mismatch`

**禁用词清单**（全局）：`保证` / `一定` / `肯定没问题` / `绝对` / `支持七天无理由` / `全球联保` / `品牌官方负责` / `直接退款` / `马上打款` / `进货价` / `成本` / `差价`

---

## 附录 C. 术语表

| 术语 | 含义 |
|------|------|
| SKU | Stock Keeping Unit，产品最小库存单位 |
| RAG | Retrieval-Augmented Generation |
| Tier | 信任度等级（1-4），1 最高 |
| Handoff | 从 AI 转接到人工 |
| Badcase | 所有非正常转人工案例（默认所有 handoff 都视为 badcase） |
| SOP | Standard Operating Procedure |
| TTFT | Time To First Token |
| Gold Rule | eval 样例中的正确答案规则 |
| handoff_summary | AI 为人工生成的案情摘要 |
| memory_case | 人工处理结束后写回的经验库 |

---

**版本历史**

- v1.0（业务 PRD）：PRD.docx
- v2.0（业务+技术合并）：PRD_v2_merged.md + tech_dev_prd_ai_customer_service_v1.md
- **v3.0（本版本，2026-04-15）**：
  - 新增模型路由方案（智谱 + 硅基流动）
  - 新增前沿交互（ThinkingIndicator / ReasoningTrace / 可打断 / PlanBreakdown）
  - A/B Test 扩展为 5 种变量可配置
  - 新增 Intent Trace 观测页
  - 全项可配置化（settings / DB 表）
  - Badcase 自动归因 + 迭代闭环
  - UI 统一为主流 AI 客服范式

**END OF PRD v3 Final**
