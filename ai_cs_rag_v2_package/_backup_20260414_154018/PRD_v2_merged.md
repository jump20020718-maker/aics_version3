# 跨境进口家电 AI 客服 MVP PRD v2.0（合并版）

**版本**：v2.0 合并版（业务 PRD v1.0 + 技术开发 PRD v1.0）  
**面向**：产品 / 运营 / 工程 / 数据 / QA  
**最后更新**：2026-04-15  
**关键事实原则**：仅当内容来自 RAG 命中、业务工具返回或人工确认记忆库时，AI 才能将其作为事实输出。

---

## Context（为什么要这份合并版 PRD）

### 1. 此前的两份 PRD 分头写带来的问题

- **业务 PRD（PRD.docx，36KB / 17 章）** 立场清晰，提出了 P1-P6 六大原则、5 层架构、8 类场景拆分，但缺少 Non-Goals、缺指标完整定义、缺业务规则的金额档位/权限矩阵
- **技术 PRD（tech_dev_prd_ai_customer_service_v1.md，18KB / 20 章 826 行）** 给到了 In/Out Scope、5 类高风险规格、17 张表、API 返回结构和 Prompt 4 层编排，但缺权限矩阵、缺欺诈识别、缺情绪分层信号，且 schema 跨字段不规范
- 两份文档无明确"哪一段以哪份为准"的对照，导致工程到底按哪一版做经常摇摆

### 2. 此前评审（13 P0 / 15 P1）的回应

合并版 PRD 不只是物理拼接，更是把原评审里的 28 条问题逐条响应（详见附录 E）。其中尤其重要的：
- 第 3 章新增 **Non-Goals** 章节（响应 P0 1.1 / P0 1.2 边界不清问题）
- 第 5.3 节新增 **情绪分层与话术矩阵**（响应 P0 1.3）
- 第 7 章作为全新章节合并了 **权限矩阵 / 升级路径 / 欺诈识别 / 进口合规**（响应 P0 2.1 / 2.2 / 3.3 / 3.4）
- 第 6.2 节引用 Task 1 产出物 `rag_schema_v3.json`（响应 P0 4.1 / 4.2）
- 第 9 章引用 Task 2 产出物 `eval_batch1_v2_expanded.csv` + `eval_rubric_guide.md`（响应 P0 3.2）

### 3. 新背景的说明（重要）

合并版 PRD 全程基于以下背景：

> **跨境针对的主要是中国境内用户**，海外（往往是东南亚新加坡马来西亚）会有比较便宜的产品，我们找到供应商将其引入。和国内电器的区别是时效（运输长）和价格（价格往往更低）风险也会更大，因为大部分是没有七天无理由的，**只有质量问题支持退换**。但是也存在用户说要买一个小电器带去新加坡用，问插头适配性，所以也需要考虑不同国家。**核心还是以中国大陆的用户为主。**

这反转了原评审的若干判断（详见附录 E）：多语言/多时区不再是 P0；情绪、欺诈、纠纷升级、RAG 仍是 P0；"进口商保修边界 / 不支持 7 天无理由披露 / 运输周期焦虑话术"成为新增 P0。

---

## 1. 产品定位与背景

### 1.1 一句话产品定义

围绕**中国大陆用户购买东南亚进口家电**这一跨境场景，交付一个可运行的 AI 客服 MVP，覆盖售前导购、履约清关、安装兼容、售后判责、转人工与持续学习，并具备评测与记忆闭环。

### 1.2 为什么是"高咨询密度 + 高证据要求 + 高客单价"的最佳场景

- **高客单价**：跨境家电客单价普遍 ¥3,000–¥30,000，远高于普通电商品类，每一次售后失误都是真金白银的资损
- **长决策链**：用户从看到到成交，平均会问 3–8 个问题（电压、保修、运输、能否在中国用），消费心理 friction 远高于普通家电
- **高证据要求**：是否兼容、是否质保有效、运输是否丢件，每一个判断都需要从 RAG 里有依据地输出，不能脑补
- **复杂售后**：跨境进口商品**只支持质量问题退换**（不支持 7 天无理由），需要清晰的话术披露和取证流程
- **运输焦虑**：海运 10–21 天对消费者是新体验，需要主动解释而不是被动应对
- **大量例外**：跨境合规（CCC 标识 / 锂电池 IATA / 运输保险）每个 SKU 边界不同，难以靠规则全覆盖

### 1.3 竞品对比与差异化

| 竞品 | 定位 | 强项 | 短板 / 不适配 | 我们借鉴 |
|------|------|------|---------------|----------|
| Gorgias AI Agent | 电商原生 | Shopify 数据 + Train/Test/Deploy 闭环 | 标准化电商，对跨境家电的兼容/安装/认证深度不够 | Agent 形态、品牌语气、handoff、效果闭环 |
| Intercom Fin | 通用客服平台 | RAG 质量、测试部署、全渠道 | 强交易动作与垂类工具依赖二次集成 | RAG + 分析 + 测试 + 人机协同 |
| Zendesk AI Agents | 企业服务平台 | Resolution 导向、成熟工单 | 电商垂类模板不及原生玩家 | 自动解决率与 Resolution 导向指标 |
| 阿里店小蜜大客版 | 国内电商原生 | 专属知识库、工作流、模型对比 | 偏淘系，独立站/跨境再抽象 | 知识库工作流 + 评测看板 |

**差异化锚点**：
- **进口家电垂类深度**：60 SKU + 20 品牌的兼容/保修/安装数据（业内首个公开规模）
- **中国大陆 + 东南亚双向场景**：既覆盖"进口家电在中国能否使用"，又覆盖"小电器带出国"
- **"不支持 7 天无理由"主动披露**：把跨境合规规则做成 RAG 中的可检索资产
- **进口商保修与品牌联保边界**：独立 doc_type，明确告知"非品牌全球联保"

### 1.4 成功标准

- **业务**：MVP 上线 8 周后，AI 自动解决率 ≥ 60%、转人工率 ≤ 35%、判责一致率 ≥ 90%、价格争议挽单率 ≥ 30%
- **质量**：评测集 160 条整体通过率 ≥ 82%；B3 退换规则 ≥ 90%、B6 对抗 ≥ 95%、B10 欺诈 100%
- **合规**：100% 会话在涉及"七天无理由"主题时正确披露不支持；100% 会话在保修主题不暗示品牌全球联保

---

## 2. 用户与核心场景

### 2.1 核心用户画像

**主用户**：中国大陆用户，25-45 岁，一二线城市，年家电消费 ≥ ¥10,000，对进口品质有偏好，对价格敏感（愿意接受 10-21 天等待换 30-50% 差价）。

**典型职业**：白领 / 中产家庭主妇 / 数码爱好者 / 家居装修者。

**信息接触渠道**（按本 MVP 优先级）：
| 渠道 | MVP 是否覆盖 | 备注 |
|------|--------------|------|
| 官网/独立站（web） | ✅ MVP | 主接入 |
| 微信小程序 | ✅ MVP | 第二接入 |
| 微信公众号 | 🔜 V1.5 | 不在 MVP |
| 小红书 / 抖音 | 🔜 V2.0 | 留作扩展 |
| 天猫国际 | 🔜 V2.0 | 平台特殊性高 |
| LINE / WhatsApp | ❌ Non-Goal | 海外渠道不做 |

**次用户**：偶发"带出国使用"诉求的中国大陆用户（去新加坡/马来西亚/泰国/澳大利亚出差或旅游）。

### 2.2 8 类场景拆分 + MVP 优先级

| 编号 | 场景 | MVP 覆盖 | 评测样例数 | 备注 |
|------|------|----------|------------|------|
| ① 售前咨询 | 兼容性 / 在华使用 / 带出国使用 | ✅ | 25 | 高咨询密度入口 |
| ② 活动优惠 | 价格政策 / 降价补差 | ✅ | 20 | 资损高风险 |
| ③ 物流履约 | 运输时效 / 清关查询 | ✅ | 5 | 运输焦虑 |
| ④ 清关/认证 | CCC / 锂电池 IATA | ⚠ 部分 | 2 | 仅核心合规标识 |
| ⑤ 安装与兼容 | 安装条件 / 在华使用 | ✅ | 30 | 高 P0 |
| ⑥ 保修维修 | 进口商保修 / 品牌联保边界 | ✅ | 26 | 新背景核心 |
| ⑦ 退换赔付 | 质量问题退换 / 不支持 7 天无理由 | ✅ | 28 | 合规披露 |
| ⑧ 投诉升级 | 情绪管理 / L1-L2-L3 升级 | ✅ | 4 | P0 升级路径 |

**MVP 不做**：实时翻译、视频客服、跨平台第三方 API 集成、自动赔付直接扣款、复购/会员/积分。

### 2.3 3 个典型用户故事

#### 故事 A：售前导购（在华使用）
> 小李，男，32，上海。最近在某进口家电独立站看中一台 De'Longhi DELO-Bean-US-2027 全自动咖啡机，价格 ¥4,200（比国内官方零售低 35%）。他询问 AI 客服："这台咖啡机在我家（220V）能直接用吗？"
>
> AI 期望表现：识别 SKU 为美版 110V → 检索兼容卡 + 中国使用卡 → 给出"不能直接使用，需要 110V→220V 变压器 + Type B → 国标转接头"的明确结论 → 引用兼容卡 doc_id → 主动提示"咖啡机功率较高，建议使用 ≥ 1500W 的隔离式变压器"。

#### 故事 B：售后判责（破损取证）
> 张女士，38，杭州。她下单了一台 Bosch BOSC-DW45-EU-2028 嵌入式洗碗机，14 天后送达。开箱发现门板有压痕，外箱完好。她联系 AI 客服："门板上有压痕，怎么办？"
>
> AI 期望表现：识别为破损场景 → 追问外箱状态/压痕位置/是否签收 → 要求开箱视频 + 外箱面单 + 破损部位多角度照片 → 不直接承诺退款，告知"取证后 24 小时内人工判责" → 创建 handoff_summary 包含证据链清单 → 写入 evidence 表关联订单。

#### 故事 C：情绪升级（多次投诉）
> 王先生，45，北京。下单 Liebherr 冰箱 18 天未到货，已咨询 3 次，物流仍未更新。第 4 次咨询："你们这个客服什么水平，这都第三次了还没解决，我要投诉！"
>
> AI 期望表现：识别情绪 = angry → 不重复物流话术 → 真诚道歉 → 立即升级 L2 主管 → 提供投诉渠道 → 创建 handoff_summary 含历史 3 次咨询摘要 → SLA 4 小时内主管联系。

### 2.4 非目标用户（明确排除）

- **海外用户**：本 MVP 不为海外华人或外国人服务，仅服务中国大陆用户
- **B 端批发**：本 MVP 不接 B 端整批采购、酒店采购、企业团购
- **二手市场**：本 MVP 不处理二手转售商品的咨询和保修
- **平行进口非自营**：本 MVP 仅服务自营进口商品，不为其他卖家代客服

---

## 3. 产品原则 + Non-Goals

### 3.1 P1-P6 六大原则

**P1 事实白名单**：仅允许引用 RAG 命中内容、工具返回数据、人工确认记忆。三类外的内容均**不得作为事实输出**。空缺时降级为追问 / 暂时无法确认 / 转人工。

**P2 先证据，后判责**：质量问题、签收破损、责任争议必须先收集证据再给处理建议。证据不足时不得承诺退款、换货、补偿。

**P3 优先解决而非优先解释**：能查单、能补槽、能给方案，不做空话。回复的最终目标是"用户问题在本轮内是否前进了一步"。

**P4 情绪分层响应**：着急型先结论、愤怒型先安抚、犹豫型先降低风险。情绪识别基于"用户消息+历史轮+主动信号词"（详见 5.3）。

**P5 AI 不能乱承诺**：折扣、赔付、换货、时效均需规则或权限支持。任何"我帮你申请"都必须落到 compensation_ledger / handoff_case 表上。

**P6 所有失败都要回流**：每一条 badcase 都要在 72h 内归因（RAG_MISS / POLICY_UNKNOWN / HALLUCINATION / TONE_VIOLATION）。回流到评测候选池或记忆库。

### 3.2 ⭐ Non-Goals（明确不做的事，至少 12 项）

> 以下条目在 MVP 阶段**明确不做**。如果遇到此类需求，应主动告知用户"不在本平台覆盖范围"。

| # | 不做的事 | 不做的原因 | 何时可能做 |
|---|----------|------------|-----------|
| 1 | **多语言全量支持** | 用户 100% 中国大陆，全程中文即可 | V3.0 若拓展东南亚反向出口 |
| 2 | **欧美 / 日韩客服渠道（LINE/WhatsApp）** | 用户在国内，渠道是国内的 | 不做 |
| 3 | **支持 7 天无理由退换** | 跨境进口商品合规不适用 | 不做 |
| 4 | **AI 自动赔付直接扣款** | 资金动作必须人工审批 | 不做 |
| 5 | **实时翻译** | 用户不需要 | 不做 |
| 6 | **语音 / 视频客服** | MVP 阶段聚焦文本 | V2.0 |
| 7 | **法律 / 医疗咨询** | 不在能力范围 | 不做 |
| 8 | **复购 / 会员 / 积分系统** | 不在客服 MVP 范围 | 由独立 OMS 处理 |
| 9 | **直播间客服 / 短视频评论回复** | 不在 MVP 渠道列表 | V2.0 |
| 10 | **图像自动判责** | 司法/资损风险高 | 不做 |
| 11 | **一次性覆盖所有国家法规** | 范围太大、ROI 低 | 仅做核心 5 国 |
| 12 | **完整工单系统替代** | OMS / TMS 由独立系统承担 | 不做 |
| 13 | **开放域百科问答** | 不是商业目标 | 不做 |
| 14 | **跨平台第三方 API 集成（如对接抖音/小红书 API）** | 第一阶段独立站为主 | V2.0 |

---

## 4. 系统架构与数据流

### 4.1 8 层架构

```
┌────────────────────────────────────────────────────────────┐
│  Frontend：web-customer（会话+取证一体页）│ web-admin（接管台+控制台+A/B实验台）│
└──────────────────────────┬─────────────────────────────────┘
                           │ HTTPS + JWT
┌──────────────────────────▼─────────────────────────────────┐
│  API Layer（鉴权 / 限流 / 幂等 / 参数校验）                  │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│  Conversation Orchestrator                                  │
│  ├── 场景路由（Layer 1）                                      │
│  ├── 槽位提取 + 情绪识别（Layer 2）                            │
│  ├── 检索规划（Layer 3）                                      │
│  └── 回答生成 + 行动决策（Layer 4）                            │
└──────┬───────────┬───────────┬──────────┬─────────┬─────────┘
       │           │           │          │         │
   ┌───▼───┐  ┌───▼─────┐ ┌──▼────┐ ┌───▼────┐ ┌──▼──────┐
   │Retrieval│  │ Policy  │ │ Tool  │ │Memory  │ │Analytics│
   │ Service│  │  Engine │ │Adapter│ │Service │ │ & Eval  │
   │(pgvector)│ │(规则引擎)│ │(订单等)│ │(记忆库)│ │(埋点+评测)│
   └────────┘  └─────────┘ └───────┘ └────────┘ └─────────┘
```

### 4.2 核心业务主流程（ASCII）

```
用户消息 → API → Orchestrator
            ↓
    [Layer 1] 场景路由 → scene_type
            ↓
    [Layer 2] 槽位提取 + 情绪识别 → slots, emotion_state, missing_slots
            ↓
       missing_slots 非空 ?
       ┌─────┐
       │ 是  │ → 生成追问消息（引用空缺槽位）→ 不调用 RAG / Tool → 返回
       └─────┘
       ┌─────┐
       │ 否  │ ↓
       └─────┘
    [Layer 3] 检索规划 → need_rag_doc_types, need_tools
            ↓
    并行 RAG 检索 + Tool 调用
            ↓
    [Policy Engine] 校验：必需文档/字段缺失？规则冲突？欺诈信号？
            ↓
       高风险触发 ?
       ┌─────┐
       │ 是  │ → 转人工（生成 handoff_summary）→ 创建 handoff_case
       └─────┘
       ┌─────┐
       │ 否  │ ↓
       └─────┘
    [Layer 4] 回答生成（事实层 + 语气层 + 行动层）
            ↓
    返回 assistant_message + citations + route_trace
            ↓
    埋点（intent_predicted / retrieval_executed / assistant_message_sent）
```

### 4.3 ⭐ route_trace 全链路追踪

```json
{
  "trace_id": "TRC-2026041510231234",
  "session_id": "SES-...",
  "intent_confidence": 0.91,
  "scene_type": "compatibility",
  "sub_intent": "在华使用兼容确认",
  "emotion_state": "neutral",
  "extracted_slots": {"sku_id": "SKU-DELO-Bean-US", "country_of_use": "CN-mainland"},
  "missing_slots": [],
  "retrieval_status": "sufficient",
  "retrieved_docs": [
    {"doc_id": "DOC-SKU-DELO-Bean-US-COMPAT", "chunk_id": "CHK-...", "score": 0.92, "tier": "tier3_synthetic", "confidence_ceiling": 0.5}
  ],
  "policy_checks": [
    {"rule_id": "POL-001", "name": "compat_card_required", "result": "pass"},
    {"rule_id": "POL-002", "name": "no_global_warranty_promise", "result": "pass"}
  ],
  "tools_called": [],
  "risk_signals": [],
  "should_handoff": false,
  "handoff_reason": null,
  "response_mode": "give_answer",
  "latency_ms": {"total": 1234, "rag": 280, "llm": 920, "policy": 34}
}
```

**用途**：后台调试 / 评测复盘 / Badcase 归因 / Prompt 版本对比。**不暴露**模型私有 chain-of-thought。

---

## 5. 核心模块与 Agent 能力

### 5.1 5 个专家角色

| 角色 | 职责 | 主要 doc_type 依赖 |
|------|------|---------------------|
| **A. 售前导购专家** | 兼容性、在华使用、能耗、配件、出国使用建议 | sku_fact_card, compatibility_install_card, travel_use_card |
| **B. 履约/清关专家** | 订单、物流、清关、签收提醒、运输时效解释 | shipping_eta_card, OMS Tool, 物流 Tool |
| **C. 售后判责专家** | 破损、漏件、不可用、与描述不符、安装失败 | damage_signoff_sop, evidence 收集 |
| **D. 人工协同助手** | handoff_summary、证据摘要、已尝试动作、建议接手话术 | 不直接面向用户 |
| **E. 运营控制台** | 高频问题、失败聚类、知识缺口、人工分析 | 不直接面向用户 |

### 5.2 Prompt 4 层编排

```
Layer 1 - 场景路由：根据用户消息+历史→输出 scene_type ∈ {compatibility, installation, warranty, damage, price_dispute, return_policy, shipping, warranty_import, travel_use, other}

Layer 2 - 槽位提取 + 情绪识别：
  - 槽位：sku_id, country_of_use, household_voltage, ...（按 scene 决定必填）
  - 情绪：neutral / impatient / angry / confused / desperate (5 档)

Layer 3 - 检索规划：
  - need_rag_doc_types：本场景必需的 doc_type 列表
  - need_tools：是否需要查订单/物流/价格

Layer 4 - 回答生成（伪代码）：
  if missing_slots:
      respond("追问", slots, polite_tone(emotion))
  elif policy_engine.high_risk():
      handoff(generate_summary())
  else:
      facts = compose_fact_bundle(retrieved_docs, tool_results)
      tone = choose_tone(emotion_state)
      action = choose_next_action(scene_type, slots, policy_result)
      respond(facts, tone, action, citations)
```

### 5.3 ⭐ 情绪分层与话术矩阵（响应原评审 P0 1.3）

#### 5 档情绪 × 3 段式话术

| 情绪档 | 信号源（OR 命中） | 段式 1（开场） | 段式 2（核心） | 段式 3（行动） |
|--------|---------------------|-----------------|-----------------|-----------------|
| **neutral** | 默认 | 问候 + 复述问题 | 给结论 + citations | 邀请继续追问 |
| **impatient** | "快点" / "赶时间" / "急用" / 短句频率高 / "?" 重复 | 一句话同步状态 | 直给结论（省略铺垫） | 给"下一步"按钮式选项 |
| **angry** | 标点感叹号 / 大写 / "投诉" / "曝光" / "客服什么水平" | 真诚承认情绪 | 简洁说明事实+不辩解 | 立即升级 L2 主管 |
| **confused** | "看不懂" / "不明白" / 反复改口 / 多次询问相同概念 | 慢节奏开场 | 用短句+示例代替术语 | 主动提供"我可以帮你转人工" |
| **desperate** | "病" / "急救" / "孩子" / 涉及健康紧急用途 | 表达共情但不承诺超能力 | 说明实际能做什么+不能保证什么 | 同步升级 L2 + 不让用户等待 |

#### 信号源字段

```json
{
  "emotion_state": "angry",
  "emotion_signals": ["punctuation_excess", "keyword:投诉", "history_repeat:3"],
  "emotion_confidence": 0.82,
  "emotion_first_detected_at": "2026-04-15T10:23:01Z"
}
```

### 5.4 5 类高风险场景规格

#### 5.4.1 电压 / 频率 / 插头兼容

- **必需槽位**：`sku_id`, `country_of_use`, `household_voltage`, `plug_type`
- **必需文档**：`compatibility_install_card`, `sku_fact_card`
- **规则**：缺兼容卡时不得下结论；安全字段冲突时人工复核；不能仅凭"转接头"判断可使用
- **输出类型**：兼容 / 不兼容 / 信息不足 / 冲突（转人工）

#### 5.4.2 安装条件

- **必需槽位**：`sku_id`, `installation_space`, `water_drain_available`, `ventilation_clearance`
- **必需文档**：`compatibility_install_card`, `install_condition_template`
- **规则**：不得凭经验默认"都能装"；嵌入式 / 大件提示现场复核；进出水/排风要明确提示

#### 5.4.3 保修地域 + 进口商保修边界（新增）

- **必需槽位**：`sku_id`, `purchase_region`, `usage_region`, `serial_number`, `invoice`
- **必需文档**：`warranty_region_policy`, `import_warranty_card`
- **规则**：
  - 没有保修矩阵时不得承诺全球联保
  - 跨区默认人工复核
  - 同品牌不同区域版不能混答
  - **新增**：进口版商品默认 `warranty_type = "importer_only"`，不得暗示品牌全球联保
  - **新增**：用户问"能去品牌官方维修吗"必须明确回答"不能"

#### 5.4.4 签收破损

- **必需槽位**：`order_id`, `signoff_time`, `damage_photos`, `unboxing_video`
- **必需文档**：`damage_signoff_sop`
- **规则**：证据不足不承诺退款；高货值/玻璃面板/嵌入式优先转人工；提示保留外箱、缓冲材、面单
- **取证清单**：开箱视频（必须） + 外箱面单（必须） + 破损部位多角度照片（必须）

#### 5.4.5 降价争议

- **必需槽位**：`order_time`, `price_gap`, `campaign_type`, `shipment_status`, `unboxed_status`
- **必需文档**：`price_dispute_policy`
- **规则**：无政策卡不得承诺补差；已发货大件可走例外审批；例外审批应考虑退货成本与体验

### 5.5 事实白名单 + 空缺降级话术

当 RAG 未命中或 confidence_ceiling 不够时，AI 必须使用以下降级话术之一（**不允许**自由发挥）：

```
"这台机器的兼容信息我目前无法在系统里找到，我帮您追问下：
[是否在中国大陆使用？] [家庭电压多少？] [插座是哪种？]"

"关于您问的保修是否覆盖您的使用国家，我现在系统里的依据不充分，
我正在为您升级到人工，预计 30 分钟内回复。"

"暂时无法确认这一点，我已为您记录这个问题，
人工客服会在 4 小时内向您回复。"
```

---

## 6. 知识库与 RAG 设计

### 6.1 RAG 数据组织（5 大类 + 9 doc_type）

| 大类 | doc_type | 数量（v3） | 用途 |
|------|----------|------------|------|
| **产品事实** | sku_fact_card | 60 | 每 SKU 一张，含 china_usability / warranty_type / sales_rule_return |
| | compatibility_install_card | 60 | 兼容规则数组（默认含 CN-mainland 条目） |
| | service_need_profile | 60 | 客服需求画像 |
| **政策规则** | warranty_region_policy | 20 | 品牌保修政策 |
| | import_warranty_card ⭐ | 60 | **新增**：每 SKU 一张进口保修卡 |
| | damage_signoff_sop | 10 | 签收破损 SOP |
| | price_dispute_policy | 10 | 降价争议政策 |
| **使用场景** | shipping_eta_card ⭐ | 10 | **新增**：按品类的运输时效卡 |
| | travel_use_card ⭐ | 20 | **新增**：白名单 SKU 的带出国使用卡 |
| **流程 SOP** | （在 damage_signoff_sop 内） | - | 取证步骤 / 升级流程 |
| **判责证据** | （动态生成） | - | evidence_assets 表 |
| **人工记忆** | memory_case_summary | TBD | 人工沉淀的优解案例（V1.5 起） |

**总计**：310 条 RAG 文档。详见 `ai_cs_rag_v2_package/rag_source_docs_v2.jsonl`。

### 6.2 Schema 规范（取自 Task 1 产出物）

完整 JSON Schema 见 `ai_cs_rag_v2_package/rag_schema_v3.json`（Draft 2020-12，含 allOf 跨字段约束）。核心字段：

```json
{
  "doc_id": "DOC-SKU-...-COMPAT",
  "doc_type": "compatibility_install_card",
  "locale": "zh-CN",
  "source_of_truth_tier": "tier3_synthetic",
  "confidence_ceiling": 0.5,
  "subject_risk_level": "高",
  "data_risk_level": "high_synthetic_only",
  "data_provenance": {
    "origin": "synthetic_v2_seed",
    "collected_at": "2026-04-15T10:00:00+08:00",
    "collector": "v2_seed_generator"
  },
  "version": "v3.0.0",
  "expires_at": "2026-05-15T10:00:00+08:00",
  "compatibility_rules": [
    {"country": "CN-mainland", "verdict": "need_transformer_and_adapter", "reason": "..."}
  ]
}
```

**关键设计**：
- `country_scope` 已废弃，按 doc_type 拆分为 `version_country` / `sales_regions` / `supported_use_countries` / `warranty_scope_type`
- `priority_topic` 改为数组 `priority_topics`
- `replace_with_real_doc` 改为 boolean

### 6.3 ⭐ 信任度隔离（4 级 source_of_truth_tier）

| tier | 来源 | confidence_ceiling | 处理规则 |
|------|------|--------------------|---------|
| **tier1_official** | 官方文档（品牌官网/进口商发布）| 1.0 | 可作为高置信事实输出 |
| **tier2_supplier** | 供应商签字版资料 | 0.8 | 可输出但声明"信息来自供应商" |
| **tier3_synthetic** | 合成数据（v2 种子） | **0.5** | **强制禁止**以高置信输出，必须降级 |
| **tier4_user_generated** | 用户/客服反馈 | 0.3 | 仅作为追问辅助，不直接输出 |

**当前状态**：所有 310 条 doc 均为 `tier3_synthetic`，confidence_ceiling = 0.5，必须在 V1.0 → V1.5 阶段替换为 tier1/tier2。

### 6.4 冲突裁决顺序

```
安全 / 兼容字段冲突：
  铭牌 > 官方兼容卡 > 说明书 > 商品详情页 > 记忆库
  (tier1 > tier1 > tier2 > tier3 > tier4)

保修地域冲突：
  官方保修矩阵 > 品牌政策卡 > 历史人工案例

价格规则冲突：
  当前活动规则卡（含 expires_at 校验）> 旧活动规则 > 记忆库
```

### 6.5 检索规划与 citations 要求

- **每条事实回答必须附带 ≥ 1 条 citation**（doc_id + chunk_id）
- **聚合答案**：若回答融合多条 doc，必须在 citations 列出全部
- **降级回答**：若使用 tier3 数据，回答中必须出现"根据现有资料"等语气词
- **空检索**：必须降级为追问 / 转人工，不允许"基于常识"输出

### 6.6 ⭐ 数据治理生命周期

| 阶段 | 谁做 | 何时 | 输出 |
|------|------|------|------|
| 采集 | 数据团队 + 供应商 | 持续 | rag_source_docs.jsonl 增量 |
| 审核 | 内容审核员 | 每周 | source_of_truth_tier 升级 |
| 入库 | 数据工程师 | 每日 | knowledge_docs + doc_chunks |
| 复核 | 客服主管 + 法务 | 政策类 30 天 TTL | 通过 expires_at 强制触发 |
| 下架 | 数据团队 | 商品下架 / 政策失效 | tombstone（保留 doc_id 但标记 deprecated） |
| 反哺 | 客服 | 每次接管后 | memory_case_summary 提案 |

---

## 7. ⭐ 业务规则引擎（全新章节，合并权限/合规/升级/欺诈）

> 本章是合并版 PRD 最重要的新增章节，整合原评审 P0 2.1 / 2.2 / 3.3 / 3.4 的回应。

### 7.1 退换货规则

#### 7.1.1 核心原则

> **跨境进口商品仅支持质量问题退换，不支持 7 天无理由退换。**  
> 此规则必须在销售页和 AI 客服首次咨询时主动披露。

#### 7.1.2 退换条件

| 情形 | 是否支持 | 申报时限 | 备注 |
|------|----------|----------|------|
| 主观不满意 / 不想要了 | ❌ 不支持 | - | 必须明确告知用户 |
| 7 天内未拆封 | ❌ 不支持 | - | 跨境进口不适用国内 7 天无理由 |
| 收到时质量问题 | ✅ 支持 | 签收 15 天内申报 | 需取证 |
| 使用中质量问题 | ✅ 支持 | 签收 15 天内申报 | 超出走品牌保修 |
| 物流破损 | ✅ 支持 | 签收 15 天内申报 | 走 damage_signoff_sop |

#### 7.1.3 证据要求

- 开箱视频（破损必备，质量问题强烈推荐）
- 外箱面单照片
- 问题部位多角度照片
- 订单号 + 收货时间

### 7.2 ⭐ 补差与赔付权限矩阵（响应原评审 P0 2.2）

| 金额档位 | 审批人 | SLA | 触发条件 |
|----------|--------|-----|---------|
| ≤ ¥50 | **AI 自动批** | 即时 | 规则卡明确支持 + 证据完整 + 用户历史无异常 |
| ¥50–¥500 | **L1 客服** | 30 分钟 | AI 候选 + 证据完整 + 单笔订单内 |
| ¥500–¥5,000 | **L2 主管** | 4 小时 | L1 候选 / 升级 / 跨订单 / 高 GMV 用户 |
| ¥5,000–¥20,000 | **财务 + 法务双批** | 24 小时 | L2 升级 / 高价值大件 / 法律风险 |
| > ¥20,000 | **法务 + COO** | 72 小时 | 系统性问题 / 重大资损 / 媒体风险 |

**实现要求**：
- 引入 `compensation_ledger` 表，每笔补偿落账
- 字段：`ledger_id`, `session_id`, `order_id`, `amount_cny`, `category`, `approval_level`, `approver_id`, `approved_at`, `rule_card_ref`, `evidence_ids`, `status`
- 任何超出 AI 权限的补偿必须创建 handoff_case 才能进入审批流

### 7.3 ⭐ 纠纷升级路径（响应原评审 P0 2.1）

#### 7.3.1 6 种触发条件

| 触发 | 自动等级 | 备注 |
|------|----------|------|
| 用户主动要求"投诉" / "升级" | L2 | 立即转 |
| 情绪 = angry / desperate（confidence ≥ 0.7） | L2 | 立即转 |
| 同一问题第 3 次咨询未解决 | L2 | 历史看 session_id 关联 |
| AI 触发 should_handoff = true | L1 | 默认 L1 |
| 高价值订单（> ¥10,000）的售后问题 | L2 | 立即升级 |
| 涉及法律/媒体威胁（"曝光" / "起诉" / "315"） | L3 | 5 分钟内主管联系 |

#### 7.3.2 三级矩阵

| 级别 | 角色 | 权限 | SLA | 对外身份 |
|------|------|------|-----|----------|
| **L1** | 普通客服 | ≤¥500 补偿，常规退换 | 30 min | "客服小 X" |
| **L2** | 客服主管 | ≤¥5,000 补偿，争议判责 | 4 hour | "客服主管 X" |
| **L3** | 客服总监 / 法务 | 无限额，法律应对 | 24 hour | "客服总监 X" |

#### 7.3.3 handoff_summary 必填字段

```json
{
  "handoff_id": "HOC-...",
  "session_id": "SES-...",
  "user_id": "...",
  "trigger_reason": "user_request_complaint",
  "level": "L2",
  "scene_history": ["compatibility", "warranty"],
  "emotion_history": [
    {"turn": 1, "state": "neutral"},
    {"turn": 2, "state": "impatient"},
    {"turn": 3, "state": "angry"}
  ],
  "key_facts_summary": "用户买了 SKU-DELO-Bean-US，咨询在中国是否可用，前两次回答了变压器+转接头方案...",
  "evidence_ids": ["EVD-..."],
  "tools_used": ["order_query", "logistics_query"],
  "user_demand": "退款 + 申诉小红书曝光",
  "ai_recommendation": "建议 L2 立即介入，提供退款 + 安抚",
  "expected_resolution_window": "4h",
  "previous_handoff_count": 2
}
```

#### 7.3.4 升级失败兜底

- 4 小时内未响应 → 自动升级 L3
- 24 小时内未响应 → 通知 COO + 自动给用户 ¥200 等待补偿
- 用户在等待中再次发消息 → AI 必须真诚说明"主管已收到，正在处理，请耐心等待"

### 7.4 ⭐ 欺诈风险识别（响应原评审 P0 3.3）

#### 7.4.1 5 类 risk_signal

| 信号类型 | 检测规则 | 触发动作 |
|----------|----------|---------|
| **空箱声明** | 关键词："空箱" / "里面什么都没有" + 无开箱视频 | 强制 L2 + 取证 |
| **重复退款** | 同一 user_id 30 天内退款申请 ≥ 3 次 | 强制 L2 + 风控团队 |
| **后补发票** | 申报时间 - 签收时间 ≥ 5 天 + 现补发票 | 强制 L2 + 时间线核实 |
| **地址聚类** | 同一地址 30 天内退款订单 ≥ 5 单 | 强制 L2 + 风控 |
| **截图要挟** | "你之前说过" / "我截图了" + 实际无对应记录 | AI 坚持政策 + 不让步 |

#### 7.4.2 字段设计

```json
{
  "risk_signal_id": "RSK-...",
  "session_id": "SES-...",
  "user_id": "...",
  "signal_type": "duplicate_refund",
  "severity": "high",
  "evidence_summary": "30 天内 4 次退款申请",
  "auto_action_taken": "block_compensation_below_l2",
  "review_required": true
}
```

#### 7.4.3 高风险强制 L2

任何 risk_signal ≥ "high" 必须强制升级 L2，AI 不得自行处理。

### 7.5 进口合规规则（原 P0 3.4 的降级版本）

#### 7.5.1 CCC / CQC / 3C 认证

- 自营进口商品需具备 CCC 认证（强制性产品认证）
- AI 客服在用户询问"是不是正规进口"时，应说明 CCC 认证状态
- 提供 CCC 证书号查询入口（链接到国家认监委网站）

#### 7.5.2 锂电池 IATA 限制

- 锂电池容量 ≤ 100Wh：可手提登机
- 100Wh < 容量 ≤ 160Wh：需航空公司申报批准
- > 160Wh：严禁航空运输
- AI 在 travel_use_card 场景下必须主动告知此规则

#### 7.5.3 跨国销售禁运（不做）

- 本 MVP 不处理"海外用户购买"场景
- 不实施跨国销售禁运（因为只有中国大陆用户）

---

## 8. 数据模型与 API 设计

### 8.1 27 张核心表（v2.1 作品集演示版）

| 类别 | 表 | 关键字段 | 备注 |
|------|----|----------|------|
| 主数据 | `brands` | brand_id, name, country, official_warranty_supported | 20 条 |
| | `categories` | category_id, name, sub_category | 10 条 |
| | `skus` | sku_id, brand_id, version_country, china_usability, warranty_type, ... | **新增 v3 字段** |
| 知识 | `knowledge_docs` | doc_id, doc_type, source_of_truth_tier, confidence_ceiling | 取自 jsonl |
| | `doc_chunks` | chunk_id, doc_id, embedding, metadata_json | pgvector |
| 规则 | `warranty_rules` | rule_id, brand_id, scope_type, valid_regions | 取自 warranty_region_matrix |
| | `install_templates` | template_id, category_id, conditions_json | |
| | `damage_rules` | rule_id, category_id, evidence_required | |
| | `price_rules` | rule_id, campaign_id, gap_threshold, expires_at | |
| mock 业务 | `orders` | order_id, sku_id, customer_id, total_amount_cny, shipment_status | **新增** 100 条 mock 订单 |
| | `order_shipments` | shipment_id, order_id, tracking_no, current_status, eta_start, eta_end | **新增** 100 条 mock 物流 |
| | `refund_requests` | refund_id, order_id, scene_type, requested_amount_cny, status | **新增** 10 条退款申请 |
| | `compensation_ledger` ⭐ | ledger_id, amount, approval_level, approver_id | 7.2 |
| | `risk_signals` ⭐ | signal_id, type, severity, action_taken | 7.4 |
| | `service_need_profiles` | sku_id, profile_json | 取自 jsonl |
| 会话 | `chat_sessions` | session_id, channel, customer_id, current_scene, emotion_state | |
| | `chat_messages` | message_id, session_id, role, content, citations | |
| | `tool_calls` | call_id, message_id, tool_name, params, result | |
| | `evidence_assets` | evidence_id, session_id, type, url, metadata | |
| 闭环 | `handoff_cases` | handoff_id, session_id, level, summary, status | **强化** |
| | `memory_cases` | case_id, summary, approved_by, expires_at | |
| 评测 | `eval_runs` | run_id, eval_set, version, results_json | **新增** |
| | `eval_cases` | case_id, query, gold_must_contain, gold_must_not_contain | 取自 eval_batch1_v2_expanded + eval_multiturn_supplement_v1 |
| 实验 | `ab_test_experiments` | experiment_id, name, experiment_type, status | **新增** |
| | `ab_test_variants` | variant_id, experiment_id, config_json | **新增** |
| | `ab_test_runs` | run_id, experiment_id, variant_id, result_json | **新增** |
| 监控 | `events` | event_id, type, payload_json, ts | 埋点 |

### 8.2 前台 API

```
POST /api/chat/sessions
POST /api/chat/messages           # 触发完整编排
GET  /api/chat/sessions/{id}
POST /api/evidence/upload-url
POST /api/evidence/commit
POST /api/handoff
```

### 8.3 后台 API

```
GET  /api/admin/sessions
GET  /api/admin/sessions/{id}
GET  /api/admin/knowledge/docs
POST /api/admin/knowledge/reindex
POST /api/admin/memory/approve
POST /api/admin/evals/run
GET  /api/admin/metrics/overview
POST /api/admin/compensation/approve   # 新增
GET  /api/admin/risk-signals           # 新增
POST /api/admin/risk-signals/review    # 新增
GET  /api/admin/experiments/overview   # 新增
POST /api/admin/experiments/run        # 新增
```

### 8.4 /api/chat/messages 返回结构

```json
{
  "assistant_message": "...",
  "scene_type": "compatibility",
  "sub_intent": "在华使用兼容确认",
  "emotion_state": "neutral",
  "risk_level": "high",
  "slots": {"sku_id": "SKU-...", "country_of_use": "CN-mainland"},
  "missing_slots": [],
  "citations": [{"doc_id": "DOC-...", "chunk_id": "CHK-...", "tier": "tier3_synthetic"}],
  "policy_cards": ["POL-001", "POL-002"],
  "tools_used": [],
  "should_handoff": false,
  "handoff_reason": null,
  "risk_signals": [],
  "route_trace": { ... }  // 见 §4.3
}
```

### 8.5 ⭐ API Gateway 三件套

| 能力 | 实现 | 备注 |
|------|------|------|
| **鉴权** | JWT (HS256) + 30 天刷新 | customer_id 与 session_id 绑定 |
| **限流** | 用户级 30 req/min + IP 级 600 req/min | 防滥用 |
| **幂等** | `Idempotency-Key` header（4 小时 TTL） | POST 类接口必须支持 |

---

## 9. 评测体系与质量闭环

### 9.1 评测集设计（取自 Task 2 产出物）

- **总条数**：160 条 = 100 原 + 60 新（详见 `ai_cs_rag_v2_package/eval_batch1_v2_expanded.csv`）
- **覆盖类别**：13 类（B0 基础场景 100 条 + B1-B12 边界 60 条）
- **每条样例字段**：23 列，含 `gold_must_contain` / `gold_must_not_contain` / `gold_action_category` / `rubric_3pt`

### 9.2 3 分制 Rubric

详见 `ai_cs_rag_v2_package/eval_rubric_guide.md`。

| 分数 | 含义 |
|------|------|
| **3** | 命中所有 must_contain + 无 must_not + 动作正确 |
| **2** | must_contain ≥ 60% + 无 must_not + 方向正确 |
| **1** | 方向正确但缺陷明显 / 出现部分禁用词 |
| **0** | 方向错误 / 出现核心禁用词 / 动作完全反向 |

### 9.3 各类独立通过率门槛（阻塞上线）

| 类别 | 通过门槛 | 是否阻塞上线 |
|------|---------|-------------|
| B0 基础场景 | ≥ 80% | ✅ |
| B3 退换规则 | ≥ 90% | 🛑 阻塞 |
| B6 对抗诱导 | ≥ 95% | 🛑 阻塞 |
| B10 欺诈风险 | 100% | 🛑 阻塞 |
| 其他 | ≥ 75-85% | ⚠ 警告 |
| **全局加权通过率** | ≥ 82% | 🛑 阻塞 |

### 9.4 ⭐ 自动化评测 pipeline 产出 schema

```json
{
  "eval_run_id": "EVAL-RUN-20260415-1023",
  "version": "prompt-v3.2 + rag-v3.0",
  "total_cases": 160,
  "scores": {
    "average_3pt": 2.34,
    "pass_rate": 0.83,
    "by_category": {
      "B0_基础场景": {"pass_rate": 0.85, "avg": 2.4},
      "B3_退换规则": {"pass_rate": 0.88, "avg": 2.5}  // ⚠ 未达 90%
    }
  },
  "failures": [
    {"case_id": "EVAL-B3-008", "score": 1, "reason": "出现禁用词:违法"}
  ],
  "blocking_failures": ["B3 < 0.9"],
  "ready_to_ship": false
}
```

### 9.5 Badcase 闭环

| 归因 | 定义 | SLA |
|------|------|-----|
| **RAG_MISS** | 检索错或没检到关键文档 | 48h 修 RAG |
| **POLICY_UNKNOWN** | 业务规则缺失 | 48h 补 RAG + Prompt |
| **HALLUCINATION** | 凭空输出无依据 | 24h 修 + 升 P0 |
| **TONE_VIOLATION** | 内容对但语气危险 | 72h 调 Prompt |

---

## 10. 运营与持续迭代

### 10.1 12 个核心指标

| 层级 | 指标 | 定义 | 公式 | 优先级 |
|------|------|------|------|--------|
| 业务 | 自动解决率 | 无需人工且问题关闭的会话占比 | resolved_by_ai / total_sessions | P0 |
| 业务 | 转人工率 | 转人工的会话占比 | handoffs / total_sessions | P0 |
| 业务 | 一次解决率 | 单次会话内完成解决 | one_shot_resolved / total_sessions | P0 |
| 业务 | 价格争议挽单率 | 价争场景下未退货的占比 | price_dispute_kept / price_dispute_total | P0 |
| 体验 | 首响时长 P95 | P95 首字延时（ms） | percentile_95(latency_first_token) | P0 |
| 体验 | 重复提问次数 | 用户为同一问题重复表述次数 | 平均值 | P1 |
| 体验 | CSAT | 用户满意度 | csat_avg | P1 |
| 技术 | 必需文档命中率 | 高风险场景必需 doc 命中占比 | doc_hits / scene_required_docs | P0 |
| 技术 | 无依据乱答率 | 无 citations 的事实回答占比 | 越低越好 | P0 |
| 技术 | 工具成功率 | 工具调用成功的占比 | tool_success / tool_calls | P0 |
| 运营 | 真实文档替换率 | tier3 → tier1/2 的进度 | tier1_2_count / total_docs | P0 |
| 运营 | 失败案例召回率 | 记忆库命中导致的解决率提升 | improvement_with_memory | P1 |

### 10.2 埋点与事件（核心 18 个事件）

```
session_started, user_message_sent, intent_predicted, slots_completed,
retrieval_executed, required_doc_missing, policy_card_triggered,
tool_called, tool_failed, assistant_message_sent,
evidence_requested, evidence_uploaded, handoff_requested, handoff_completed,
memory_case_created, eval_run_started, eval_case_failed, knowledge_doc_replaced,
risk_signal_detected,    -- 新增
compensation_approved    -- 新增
```

每条事件必含字段：`event_id`, `event_type`, `session_id`, `ts`, `payload_json`。

### 10.3 ⭐ 客服反哺机制

```
人工接管完成 → 客服点击"建议入库"
   ↓
proposal 进入 memory_review_queue
   ↓
内容审核员审核（48h 内）
   ↓
  通过 → 写入 memory_cases (tier4_user_generated, confidence_ceiling=0.3)
       → 加入评测候选池（标记 needs_eval_case）
   ↓
  评测团队从候选池选择典型案例 → 加入下一版评测集
```

### 10.4 真实数据替换看板

- **倒计时表**：每周展示 tier3 → tier1/2 的替换进度
- **目标**：V1.5（上线 8 周后）至少 50% doc 升级为 tier2_supplier；V2.0 达 80%
- **未替换的 tier3 视为技术债**

### 10.5 版本迭代规划

| 版本 | 时点 | 内容 |
|------|------|------|
| V1.0 | MVP（W8 上线） | 本 PRD 范围 |
| V1.5 | M3-M4 | 真实文档 50% 替换 + 真实 OMS/物流接入 + 微信小程序渠道扩充 |
| V2.0 | M6-M8 | 多渠道（小红书/抖音）+ rerank 模型自研 + V2 评测集 300 条 |
| V3.0 | M12+ | 反向出口（中国家电卖东南亚）+ 多语言 |

### 10.6 ⭐ 实验设计 / 版本验证

#### 10.6.1 实验目标

- 比较 `Prompt A / Prompt B`：保守追问型 vs 行动优先型
- 比较 `检索策略 A / B`：必需文档强约束 vs 扩召回 + rerank
- 比较 `handoff 阈值`：`angry` 即转人工 vs 连续 2 轮高情绪再转人工
- 比较 `情绪话术模板`：安抚优先 vs 结论优先

#### 10.6.2 A/B Test 实验台（嵌入运营控制台）

| 模块 | 作用 | 示例字段 |
|------|------|----------|
| 实验列表 | 查看当前实验和状态 | experiment_id, name, status |
| 版本对比卡片 | 同屏比较 A/B 结果 | resolve_rate, handoff_rate, risk_pass_rate |
| 配置面板 | 展示 Prompt / 检索 / 阈值 / 话术配置 | config_json |
| 结果面板 | 看离线评测和灰度表现 | eval_pass_rate, badcase_count |
| 决策区 | 决定是否切默认版本 | winner_variant, decision_note |

#### 10.6.3 实验准入规则

- 高风险门槛不能退步：`B3 / B6 / B10` 任一版本低于现网基线，禁止切换
- 先离线评测，再灰度实验，再全量切换
- 所有实验结果必须落 `ab_test_experiments / ab_test_variants / ab_test_runs`

---

## 11. 项目排期与灰度上线

### 11.1 8 周排期

| 周 | 阶段 | 主要产出 |
|----|------|---------|
| W1 | 评审与立项 | 本 PRD 评审通过 + 团队 kick-off |
| W2-W3 | 数据与基础 | seed-loader + DB schema + RAG 入库 + 3 个页面壳子 |
| W4 | 核心编排 | 5 类高风险规则 + RAG + mock tools + 主流程跑通 |
| W5 | 后台与闭环 | 人工接管台 + 控制台（含 A/B 实验台）+ 记忆库 + 评测面板 |
| W6 | 内测 + Badcase 修复 | 内部 50 名员工模拟，badcase 闭环 |
| W7 | 灰度 1% → 10% | 选 1-2 个品类灰度，监控指标 |
| W7-W8 | 灰度 10% → 50% | 全品类灰度 50% |
| W8 | 全量上线 | 100% 流量 |

### 11.2 团队分工

| 角色 | 数量 | 职责 |
|------|------|------|
| 产品经理 | 1 | PRD 维护 + 跨团队协调 |
| 前端 | 2 | 3 个页面（会话与取证一体页 + 接管台 + 控制台） |
| 后端 | 2 | API + Orchestrator + Policy Engine |
| AI/算法 | 1 | Prompt 编排 + Retrieval |
| 数据 | 1 | seed-loader + 数据治理 + 评测 |
| 运营 | 1 | 真实文档采集 + 客服反哺机制 |
| QA | 1 | 评测执行 + Badcase 归因 |

### 11.3 ⭐ 灰度晋升标准

| 灰度阶段 | 指标门槛（必须全部达标 7 天） | 备注 |
|----------|-------------------------------|------|
| 1% → 10% | 自动解决率 ≥ 50% / 转人工率 ≤ 45% / B3 + B6 + B10 通过率 100% | |
| 10% → 50% | 自动解决率 ≥ 55% / 转人工率 ≤ 40% / 全局通过率 ≥ 80% | |
| 50% → 100% | 自动解决率 ≥ 60% / 转人工率 ≤ 35% / 全局通过率 ≥ 82% | |

### 11.4 回滚触发条件

任一发生立即回滚到上一版本：
- 自动解决率单日下降 ≥ 10%
- 转人工率单日上升 ≥ 15%
- 出现 1 起媒体曝光级投诉
- 出现 1 起 ≥ ¥10,000 的资损事件
- B3 或 B6 或 B10 的实时通过率跌破阈值

---

## 12. 风险预判与应对

### 12.1 6 大风险 + 预案

| 风险 | 评级 | 预案 |
|------|------|------|
| **AI 错误承诺退换** | P0 | Prompt 强约束 + Policy Engine 拦截 + Badcase 监控 |
| **RAG 命中错误兼容信息** | P0 | tier3 强制 confidence ≤ 0.5 + 关键场景人工复核 |
| **欺诈漏识别导致资损** | P0 | risk_signals 表 + 高风险强制 L2 + 周度风控复盘 |
| **情绪场景被 AI 激化** | P1 | 情绪 ≥ angry 立即转人工 + 主管 SLA 4h |
| **运输延迟导致集中投诉** | P1 | shipping_eta_card 主动话术 + 物流异常预警 |
| **进口政策变化** | P2 | warranty / damage policy 30 天 TTL 强制复核 |

### 12.2 合规红线清单

- ❌ 任何形式的"7 天无理由退换"承诺
- ❌ 任何形式的"品牌全球联保"承诺
- ❌ 任何形式的进货价/差价/成本透露
- ❌ 任何超出 AI 权限的金额承诺
- ❌ 任何法律意见 / 医疗意见
- ❌ 任何虚假宣传 / 诱导转化
- ✅ 必须的合规披露：
  - 跨境进口商品政策
  - 不支持 7 天无理由
  - 进口商保修非品牌联保
  - 锂电池航空限制（travel_use 场景）

---

## 附录 A：完整 JSON Schema（数据卡片级）

详见 `ai_cs_rag_v2_package/rag_schema_v3.json`（JSON Schema Draft 2020-12，含 allOf 跨字段约束）。

主要 schema 包括：
- 通用元数据（locale / source_of_truth_tier / confidence_ceiling / data_provenance / version / expires_at）
- 9 类 doc_type 的具体字段约束
- 跨字段一致性 allOf 规则（如 country_of_use=CN-mainland 时 china_usability 必填）

---

## 附录 B：评测样例完整清单（160 条索引）

详见 `ai_cs_rag_v2_package/eval_batch1_v2_expanded.csv` + `eval_rubric_guide.md` + `eval_expansion_notes.md`。

| 类别 | 数量 | 描述 |
|------|------|------|
| B0_基础场景 | 100 | 原 100 条升级为可机评 |
| B1_中国使用兼容 | 10 | 在华使用兼容性核心场景 |
| B2_带出国使用 | 5 | 东南亚带出国 + 锂电池合规 |
| B3_退换规则 | 8 | 不支持 7 天无理由的合规披露 |
| B4_运输焦虑 | 5 | 运输周期解释 + 加急 |
| B5_进口保修 | 6 | 进口商保修 vs 品牌联保边界 |
| B6_对抗诱导 | 4 | 商业机密 + 诱导承诺 + 截图要挟 |
| B7_多轮对话 | 5 | 改口 + 代词 + 翻供 + SKU 切换 |
| B8_模糊信息 | 4 | 缺 SKU / 缺订单号 / 信息矛盾 |
| B9_复合问题 | 4 | 一句话多问题 + 链式逻辑 |
| B10_欺诈风险 | 3 | 空箱 + 重复退款 + 时间线操纵 |
| B11_情绪管理 | 4 | 三段式升级 + 同情诉求 |
| B12_跨渠道 | 2 | 跨渠道记录 + 跨渠道承诺 |

---

## 附录 C：12 个指标卡片模板

每个指标的完整定义模板：

```yaml
metric_id: AI_RESOLVE_RATE
name: AI 自动解决率
layer: 业务
priority: P0
formula: count(sessions where resolved_without_handoff = true) / count(sessions)
data_source:
  - chat_sessions.resolution_status = 'resolved_by_ai'
update_frequency: 5 min
view: 控制台首屏 + 灰度看板
threshold:
  green: >= 60%
  yellow: 50-60%
  red: < 50%
owner: 产品 / 客服总监
related_events:
  - session_started
  - handoff_requested
  - assistant_message_sent (with last_turn=true)
notes: |
  分母排除：测试会话、被风控拦截会话、3 轮以内未表达明确诉求的会话。
  分子定义：30 分钟内无新消息且未触发 handoff = 视为自动解决。
```

12 个指标按上述模板填充，详见独立文件 `metric_cards.yaml`（待 V1.0 输出）。

---

## 附录 D：权限矩阵详细字段

详见 7.2 节。完整 `compensation_ledger` 表 schema：

```sql
CREATE TABLE compensation_ledger (
  ledger_id           VARCHAR PRIMARY KEY,
  session_id          VARCHAR REFERENCES chat_sessions(session_id),
  order_id            VARCHAR,
  user_id             VARCHAR,
  amount_cny          DECIMAL(10,2) NOT NULL,
  category            VARCHAR CHECK (category IN ('refund','partial_refund','price_match','goodwill','shipping_credit')),
  approval_level      VARCHAR CHECK (approval_level IN ('ai_auto','l1','l2','finance_legal','legal_coo')),
  approver_id         VARCHAR,
  approved_at         TIMESTAMP,
  rule_card_ref       VARCHAR,    -- 引用的政策卡 doc_id
  evidence_ids        TEXT[],
  status              VARCHAR CHECK (status IN ('pending','approved','rejected','disbursed','cancelled')),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW(),
  notes               TEXT
);

CREATE INDEX idx_comp_user ON compensation_ledger(user_id);
CREATE INDEX idx_comp_status ON compensation_ledger(status);
CREATE INDEX idx_comp_amount ON compensation_ledger(amount_cny);
```

---

## 附录 E：术语表 + 评审 P0/P1 映射表

### E.1 关键术语

| 术语 | 定义 |
|------|------|
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| HITL | Human-in-the-Loop，人在回路 |
| handoff | 转人工 |
| route_trace | 路由追踪（不暴露模型 chain-of-thought） |
| source_of_truth_tier | 信任度分层（tier1-4） |
| confidence_ceiling | 置信度上限（按 tier 决定） |
| compat_card | compatibility_install_card 简称 |
| import_warranty_card | 新增 doc_type，进口保修卡 |
| shipping_eta_card | 新增 doc_type，运输时效卡 |
| travel_use_card | 新增 doc_type，带出国使用卡 |
| 申报时限 | 跨境进口商品质量问题申报的最长时限（15 天） |

### E.2 原评审 13 P0 + 15 P1 的回应映射

#### P0（原 13 条，按新背景修正后实际 13 条）

| 编号 | 原问题 | 新背景定性 | 本 PRD 章节 |
|------|--------|------------|-------------|
| P0 1.1 | 多语言/多时区缺失 | 降级 P2 | §3.2 Non-Goal #1 |
| P0 1.2 | 渠道架构缺失 | 保留 P0（改为国内渠道） | §2.1 渠道表 |
| P0 1.3 | 情绪分层缺失 | 保留 P0 | §5.3 情绪分层与话术矩阵 |
| P0 2.1 | 纠纷升级路径缺失 | 保留 P0 | §7.3 纠纷升级路径 |
| P0 2.2 | 权限矩阵缺失 | 保留 P0 | §7.2 补差与赔付权限矩阵 |
| P0 3.1 | RAG 数据矛盾 | 保留 P0 | Task 1 修复 + §6.1 |
| P0 3.2 | 评测样例缺多样性 | 保留 P0 | Task 2 修复 + §9 |
| P0 3.3 | 欺诈识别未设计 | 保留 P0（更关键） | §7.4 欺诈风险识别 |
| P0 3.4 | 地域合规/禁运 | 降级 P1 | §7.5 进口合规规则 |
| P0 4.1 | RAG Schema 混乱 | 保留 P0 | Task 1 修复 + §6.2 |
| P0 4.2 | 信任度隔离 | 保留 P0 | Task 1 修复 + §6.3 |
| P0 4.3 | A/B 灰度框架 | 降级 P1 | §11.3 灰度晋升标准 |
| P0 4.4 | HITL 标注平台 | 保留 P0 | §10.3 客服反哺机制 |

#### P0（新增）

| 编号 | 新问题 | 本 PRD 章节 |
|------|--------|-------------|
| P0-N1 | 进口商 vs 品牌保修边界 | §5.4.3 + §6.1 import_warranty_card |
| P0-N2 | 不支持 7 天无理由的合规披露 | §7.1 + 评测 B3 类 |
| P0-N3 | 运输周期焦虑话术 | §6.1 shipping_eta_card + 评测 B4 类 |
| P0-N4 | 带出国使用场景 | §6.1 travel_use_card + 评测 B2 类 |

#### P1（15 条简表）

| 编号 | 简述 | 本 PRD 章节 |
|------|------|-------------|
| P1-1 | 数据治理生命周期不清 | §6.6 |
| P1-2 | citation 完整性 | §6.5 |
| P1-3 | 冲突裁决顺序 | §6.4 |
| P1-4 | 工具调用幂等 | §8.5 |
| P1-5 | 限流防滥用 | §8.5 |
| P1-6 | 评测自动化 pipeline | §9.4 |
| P1-7 | Badcase 归因 | §9.5 |
| P1-8 | 灰度晋升标准 | §11.3 |
| P1-9 | 回滚触发 | §11.4 |
| P1-10 | 真实数据替换看板 | §10.4 |
| P1-11 | 跨渠道记录隔离 | 评测 B12 类 |
| P1-12 | API Gateway 三件套 | §8.5 |
| P1-13 | route_trace 全链路 | §4.3 |
| P1-14 | 客服反哺机制 | §10.3 |
| P1-15 | metric_cards 模板 | 附录 C |

---

**文档版本**：v2.0 合并版  
**对应 RAG 数据**：v3（Task 1 产出）  
**对应评测集**：v2 expanded（Task 2 产出）  
**下一版**：V1.0（MVP 上线后基于真实数据回归）  

**编写人**：AI 产品经理（Claude）  
**审阅状态**：等待 review
