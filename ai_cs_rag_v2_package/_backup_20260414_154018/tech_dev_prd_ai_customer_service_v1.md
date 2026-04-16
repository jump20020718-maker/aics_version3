# 跨境进口家电 AI 客服系统｜技术开发 PRD v1.0

面向：coding agent / 全栈工程师 / AI 应用开发者  
目标：基于已有业务 PRD、RAG v2 底稿、流程图与原型初稿，开发一个 **可运行的跨境进口家电 AI 客服 MVP**。

---

## 0. 一句话目标

围绕跨境进口家用电器场景，交付一个可运行的 AI 客服系统，至少包含：
- 会话与取证一体页
- 人工接管台
- 运营控制台（含 A/B Test 实验台）
- RAG 入库与检索
- 评测与记忆闭环

当前基础数据包：
- 60 个 SKU
- 10 个商品类目
- 20 个品牌
- 220 条 RAG 文档注册记录
- 54 条优先字段规范
- 100 条首批评测样例
- 197 条真实文档替换清单

---

## 1. 最重要的系统原则

### 1.1 事实白名单原则
系统只能把以下 3 类内容作为“事实”输出：
1. RAG 命中的知识文档内容
2. 业务工具返回的结构化数据
3. 人工确认并审核通过的记忆库内容

除以上三类外，模型 **不得把任何内容当作事实输出**。  
若缺少事实依据，只能：
- 继续追问补槽
- 明确说明“暂时无法确认”
- 转人工

### 1.2 先证据，后判责
对质量问题、签收破损、责任争议类问题，系统必须先收集证据，再给出处理建议。  
不得在证据不足时承诺退款、换货或补偿。

### 1.3 先兼容，后建议
跨境家电必须优先核对：
- 使用国家 / 地区
- 家庭电压 / 频率
- 插头类型
- 安装空间与进出水 / 散热条件

在未核实前，不得默认“可以直接用”。

### 1.4 前台有人味，后台可追溯
前台回复要自然、真诚、简洁，但后台必须能看到：
- 场景路由结果
- 已识别槽位
- 命中文档
- 调用工具
- 规则卡
- 最终转人工原因

注意：后台展示的是 **route trace / decision summary**，不是模型私有 chain-of-thought。

### 1.5 高风险必须转人工
以下情况必须转人工或至少人工复核：
- 必需文档缺失
- 安全 / 兼容字段冲突
- 保修地域冲突
- 高价值大件破损争议
- 降价争议需例外审批
- 用户强烈投诉 / 法律威胁 / 平台申诉倾向

---

## 2. 产品范围

## 2.1 In Scope

### 前台
- 会话与取证一体页
- 文件 / 图片 / 视频上传
- 快捷问题引导
- 转人工入口

### 后台
- 人工接管台
- 运营控制台（含 A/B Test 实验台）
- 文档管理与替换进度
- 评测执行与失败样例查看
- 记忆库沉淀与审核

### AI / 系统能力
- 场景识别
- 槽位提取
- RAG 检索
- 规则引擎
- 工具调用
- 回答生成
- 人工接管摘要
- 失败案例记忆

## 2.2 Out of Scope
- 语音客服
- 开放域百科问答
- 多语言全量支持
- 完整工单系统替代
- 自动图像判责直接退款
- 一次性覆盖所有国家法规

---

## 3. 当前输入资产（必须接入工程）

### 3.1 已有文件
- `跨境进口家电AI客服_RAG底稿深化_v2.xlsx`
- `rag_source_docs_v2.jsonl`
- `sku_master_60.csv`
- `real_doc_checklist.csv`
- `eval_batch1_priority5.csv`
- `field_specs_priority5.json`
- `mock_orders_100.csv`
- `mock_logistics_100.csv`
- `mock_refunds_10.csv`
- `mock_compensations_10.csv`
- `mock_risk_signals_10.csv`
- `eval_multiturn_supplement_v1.csv`
- 流程图与线框图 SVG
- HTML 原型首页

### 3.2 工程要求
需要提供 `seed-loader` 脚本，一键完成：
1. 读取 Excel / CSV / JSONL
2. 导入数据库
3. 生成 knowledge_docs 与 doc_chunks
4. 初始化评测集
5. 写入默认规则卡与元数据索引
6. 导入 mock 订单 / 物流 / 退款 / 赔付 / 风控信号
7. 初始化 A/B 实验配置

---

## 4. 目标用户与角色

### 顾客
目标：快速解决购买、履约、安装、保修、破损、价格争议等问题。

### 人工客服
目标：接管复杂、高风险、例外问题，并把结果沉淀回系统。

### 运营 / 产品
目标：管理知识、观察高频问题、做评测、优化提示词与规则。

### 管理员
目标：管理环境、工具接入、权限、日志与审计。

---

## 5. 高层架构

系统建议拆为以下层：

### 5.1 Frontend
- `web-customer`：会话与取证一体页
- `web-admin`：人工接管台 + 运营控制台（含 A/B Test 实验台）

### 5.2 API Layer
统一对外接口，负责：
- 鉴权
- 参数校验
- 会话接口
- 证据上传接口
- 后台管理接口
- 评测接口

### 5.3 Conversation Orchestrator
负责主流程编排：
- 场景识别
- 情绪识别
- 槽位提取
- 风险判定
- 检索计划生成
- 工具调用决策
- 最终回复生成
- 转人工决策

### 5.4 Retrieval Service
负责：
- 文档入库
- chunk
- embedding
- metadata filter
- rerank
- citations 打包

### 5.5 Policy Engine
对高风险场景执行规则：
- 电压 / 频率 / 插头兼容
- 安装条件
- 保修地域
- 签收破损
- 降价争议

### 5.6 Tool Adapters
MVP 使用 mock adapter，后续可替换真接口：
- 订单
- 物流
- 价格
- CRM / 工单
- 退款 / 售后
- 媒体上传

### 5.7 Memory Service
负责：
- 转人工案例入库
- 人工最终答案沉淀
- 审核通过
- 相似案例召回
- 聚类压缩总结

### 5.8 Analytics & Eval
负责：
- 埋点
- KPI 聚合
- 离线评测
- 失败样例回放
- Prompt / 规则版本对比

---

## 6. 推荐技术栈

为了让 coding agent 更稳定地产出，建议先走单栈：

### 6.1 推荐方案
- Frontend：Next.js + React + Tailwind + shadcn/ui
- Backend：Node.js + TypeScript + Fastify 或 Express
- DB：PostgreSQL
- 向量检索：pgvector
- 文件存储：本地文件系统或 S3 兼容对象存储
- 数据脚本：Node 脚本优先，必要时允许 Python 做离线处理

### 6.2 原则
- 先单服务可运行，再拆微服务
- 先 mock tools，再换真实工具
- 先本地 seed 数据闭环，再接入真实文档

---

## 7. 五类优先高风险场景规格

## 7.1 电压 / 频率 / 插头兼容
### 必需槽位
- `sku_id`
- `country_of_use`
- `household_voltage_frequency`
- `plug_type`

### 必需文档
- `compatibility_install_card`
- `sku_fact_card`

### 规则
- 缺兼容卡时不得下结论
- 安全字段冲突时人工复核
- 不能仅凭“转接头”判断可以使用

### 系统输出类型
- 兼容
- 不兼容
- 信息不足，需要补槽
- 冲突，转人工

## 7.2 安装条件
### 必需槽位
- `sku_id`
- `installation_space`
- `water_drain_available`
- `ventilation_clearance`

### 必需文档
- `compatibility_install_card`
- `install_condition_template`

### 规则
- 不得凭经验默认“都能装”
- 大件 / 嵌入式设备提示现场复核
- 有进出水 / 排风要求时需明确提示

## 7.3 保修地域
### 必需槽位
- `sku_id`
- `purchase_region`
- `usage_region`
- `invoice`
- `serial_number`

### 必需文档
- `warranty_region_matrix`
- `warranty_policy_card`

### 规则
- 没有保修矩阵时不得承诺全球联保
- 跨区默认人工复核
- 同品牌不同区域版不能混答

## 7.4 签收破损
### 必需槽位
- `order_id`
- `signoff_time`
- `damage_photos`
- `unboxing_video`

### 必需文档
- `damage_signoff_rules`
- 物流规则 / 签收规则

### 规则
- 证据不足不承诺退款
- 高货值 / 玻璃面板 / 嵌入式优先转人工
- 先提示保留外箱、缓冲材、快递面单

## 7.5 降价争议
### 必需槽位
- `order_time`
- `price_gap`
- `campaign_type`
- `shipment_status`
- `unboxed_status`

### 必需文档
- `price_dispute_rules`
- 当前活动规则卡

### 规则
- 无政策卡不得承诺补差
- 已发货大件可走例外审批
- 例外审批应考虑退货成本与用户体验

---

## 8. 功能需求（Functional Requirements）

## FR-01 会话管理
### 要求
- 创建会话
- 保存消息
- 维护当前场景、当前 SKU、情绪状态、槽位状态
- 自动生成 AI 摘要

## FR-02 意图与槽位识别
### 输出结构（必须 JSON 化）
```json
{
  "scene_type": "compatibility|installation|warranty|damage|price_dispute|other",
  "sub_intent": "can_use_directly",
  "emotion_state": "neutral|impatient|angry|confused",
  "sku_id": "SKU-DELO-Bean-US",
  "missing_slots": ["country_of_use"],
  "risk_level": "high",
  "need_rag_doc_types": ["compatibility_install_card"],
  "need_tools": [],
  "should_handoff": false
}
```

## FR-03 RAG 检索
### 要求
- 支持 metadata filter
- 支持按场景限制必需文档类型
- 支持 rerank
- 返回 citations
- 返回 retrieval status

## FR-04 工具调用
### MVP 工具
- 订单查询
- 物流查询
- 价格查询
- CRM / 工单创建
- 媒体上传确认

## FR-05 风险与规则引擎
### 要求
- 在回答前执行规则判断
- 若必需文档缺失，则阻止事实性回答
- 若高风险规则命中，则优先转人工或追问

## FR-06 响应生成
### 输出分为三层
1. 事实层：只来自 RAG / 工具 / 记忆库
2. 语气层：根据用户状态适配
3. 行动层：下一步要补什么信息、做什么操作

## FR-07 售后取证
### 要求
- 支持图片 / 视频上传
- 支持动态展示证据清单
- 支持按类目提示拍摄角度和保留材料
- 支持把证据与消息、订单绑定

## FR-08 人工接管
### 要求
- 生成 handoff summary
- 展示会话全量消息
- 展示 AI 摘要
- 展示证据面板
- 展示命中文档与工具结果
- 支持人工标记最终处理结果

## FR-09 记忆库
### 要求
- 人工处理完成后可写入 `memory_case`
- 记忆入库前要审核
- 记忆只能辅助，不能单独作为高风险结论依据
- 支持聚类压缩

## FR-10 运营后台
### 要求
- 查看会话分布
- 查看文档替换进度
- 查看失败案例
- 运行评测
- 对比版本效果

---

## 9. RAG 设计要求

## 9.1 当前入库对象
必须支持导入当前数据包中的 220 条文档注册记录。

## 9.2 必须保留的 metadata
- `doc_id`
- `doc_type`
- `domain`
- `brand`
- `category`
- `sku_id`
- `country_scope`
- `priority_topic`
- `risk_level`
- `source_type`

## 9.3 文档类型优先级
### P0：可直接裁决高风险问题
- compatibility_install_card
- warranty_policy / warranty_region_matrix
- damage_signoff_rule
- price_dispute_rule

### P1：商品事实与安装说明
- sku_fact_card
- install_condition_template

### P2：辅助文档
- service_need_profile
- faq_seed

### P3：记忆文档
- memory_case_summary

## 9.4 Chunk 规则
- 结构化卡片：1 文档 = 1 chunk 或少量 chunk
- 长说明书：按 300–600 汉字或等效 token 分段
- 政策卡：按“适用范围 / 所需材料 / 边界 / 转人工条件”拆段

## 9.5 冲突裁决顺序
### 安全 / 兼容字段冲突
`铭牌 / 官方兼容卡 > 说明书 > 商品详情页 > 记忆库`

### 保修地域冲突
`官方保修矩阵 > 品牌政策卡 > 历史人工案例`

### 价格规则冲突
`当前活动规则卡 > 旧活动规则 > 记忆库`

---

## 10. 数据模型（建议）

至少包含以下表：
- `brands`
- `categories`
- `skus`
- `knowledge_docs`
- `doc_chunks`
- `warranty_rules`
- `install_templates`
- `damage_rules`
- `price_rules`
- `service_need_profiles`
- `chat_sessions`
- `chat_messages`
- `tool_calls`
- `evidence_assets`
- `handoff_cases`
- `memory_cases`
- `eval_cases`
- `eval_runs`
- `orders`
- `order_shipments`
- `refund_requests`
- `compensation_ledger`
- `risk_signals`
- `ab_test_experiments`
- `ab_test_variants`
- `ab_test_runs`
- `events`

### 10.1 chat_sessions 建议字段
- `session_id`
- `channel`
- `customer_id`
- `current_scene`
- `current_sku_id`
- `emotion_state`
- `slot_json`
- `risk_level`
- `resolution_status`
- `summary_text`

### 10.2 knowledge_docs 建议字段
- `doc_id`
- `doc_type`
- `title`
- `brand`
- `category`
- `sku_id`
- `country_scope`
- `priority_topic`
- `risk_level`
- `source_type`
- `replace_with_real_doc`
- `raw_content`

### 10.3 doc_chunks 建议字段
- `chunk_id`
- `doc_id`
- `chunk_index`
- `chunk_text`
- `embedding`
- `metadata_json`

---

## 11. API 设计（MVP）

## 11.1 前台
- `POST /api/chat/sessions`：创建会话
- `POST /api/chat/messages`：发送消息，触发完整编排
- `GET /api/chat/sessions/{id}`：获取会话与消息
- `POST /api/evidence/upload-url`：申请上传地址
- `POST /api/evidence/commit`：确认上传
- `POST /api/handoff`：转人工

## 11.2 后台
- `GET /api/admin/sessions`：会话列表
- `GET /api/admin/sessions/{id}`：会话详情
- `GET /api/admin/knowledge/docs`：文档列表
- `POST /api/admin/knowledge/reindex`：重建索引 / 入库
- `POST /api/admin/memory/approve`：审核记忆
- `POST /api/admin/evals/run`：运行评测
- `GET /api/admin/metrics/overview`：指标总览

## 11.3 /api/chat/messages 返回结构要求
```json
{
  "assistant_message": "...",
  "scene_type": "compatibility",
  "sub_intent": "can_use_directly",
  "emotion_state": "impatient",
  "risk_level": "high",
  "slots": {},
  "missing_slots": ["country_of_use"],
  "citations": [{"doc_id":"DOC-...","chunk_id":"CHK-..."}],
  "policy_cards": ["KD02"],
  "tools_used": [],
  "should_handoff": false,
  "handoff_reason": null,
  "route_trace": {
    "intent_confidence": 0.91,
    "retrieval_status": "sufficient",
    "response_mode": "ask_follow_up"
  }
}
```

说明：
- `route_trace` 用于后台可视化与调试
- 不等于暴露模型私有推理

---

## 12. 页面需求

## 12.1 会话与取证一体页
### 模块
- 消息流
- 快捷问题入口
- 输入框
- 文件上传入口
- 转人工入口
- 证据要求清单
- 订单信息录入
- 时间线
- 当前缺失证据提示

### 交互要求
- 首轮支持“兼容 / 安装 / 保修 / 破损 / 价格”快捷问题
- 支持对不耐烦用户优先给结论或下一步
- 显示“人工客服可能排队，AI 可先帮你整理背景”
- 不同类目展示不同拍摄要求
- 明确提示保留外箱、缓冲材、面单等材料

## 12.2 人工接管台
### 模块
- AI 摘要
- 消息流
- 证据面板
- 命中文档面板
- 工具结果面板
- 人工回复框
- 最终处理标签

## 12.3 运营控制台（含 A/B Test 实验台）
### 模块
- 指标总览
- 会话场景分布
- 高频问题分布
- 文档替换进度
- 评测面板
- 失败样例列表
- A/B 实验列表
- 版本对比卡片
- 实验结果面板

---

## 13. Prompt / 编排要求

建议拆成 4 层：
1. 场景路由层
2. 槽位提取层
3. 检索规划层
4. 回答生成层

### 回答生成逻辑（伪代码）
```python
if required_docs_missing or critical_fields_missing:
    ask_follow_up_or_handoff()
elif policy_conflict:
    handoff_with_summary()
else:
    facts = compose_fact_bundle()
    tone = choose_tone(emotion_state)
    action = choose_next_action(scene_type, policy_result)
    respond(facts, tone, action, citations)
```

### 编排要求
- 回答 Prompt 只能消费结构化 facts bundle
- 不能让模型直接从用户消息自由发挥事实
- 高风险问题以规则引擎优先，LLM 主要负责解释与追问

---

## 14. 埋点与指标

## 14.1 业务指标
- AI 自动解决率
- 转人工率
- 一次会话解决率
- 价格争议挽单率

## 14.2 体验指标
- 首响时长
- 用户重复表述次数
- 补槽完成率
- 满意度

## 14.3 技术指标
- 意图准确率
- 必需文档命中率
- 无依据乱答率
- 工具成功率

## 14.4 运营指标
- 真实文档替换率
- 失败案例召回率
- 评测通过率
- 版本对比

## 14.5 必须上报的关键事件
- `session_started`
- `user_message_sent`
- `intent_predicted`
- `slots_completed`
- `retrieval_executed`
- `required_doc_missing`
- `policy_card_triggered`
- `tool_called`
- `tool_failed`
- `assistant_message_sent`
- `evidence_requested`
- `evidence_uploaded`
- `handoff_requested`
- `handoff_completed`
- `memory_case_created`
- `eval_run_started`
- `eval_case_failed`
- `knowledge_doc_replaced`

## 14.6 版本验证 / A/B Test
### 需要支持比较的四类实验
- Prompt A / Prompt B
- 检索策略 A / B
- handoff 阈值 A / B
- 情绪话术模板 A / B

### 控制台要求
- 可创建实验
- 可查看 A/B 两版本核心指标对比
- 可查看高风险场景是否退步
- 可记录最终采用哪个版本

---

## 15. 评测与验收

系统必须接入当前 100 条首批评测样例，至少支持：
- 离线运行
- 结果落库
- 失败样例回放

### 最低验收要求
1. 五类优先高风险主题全部可跑通
2. 必需文档缺失时不输出事实性结论
3. 每次回答都可追溯 `doc_id / chunk_id / tool_result_id`
4. 3 个主要页面都可演示完整流程（会话与取证一体页 / 接管台 / 控制台）
5. 可导入 220 条种子文档并完成检索
6. 可运行 100 条基础评测 + 10 条多轮补充评测
7. 人工接管后可回写 `memory_case`
8. 控制台可展示 A/B Test 对比结果

---

## 16. 开发阶段建议

## P0 基础搭建
目标：
- 工程初始化
- 数据库 schema
- seed-loader
- 页面壳子

产出：
- 项目可启动
- 数据可导入

## P1 核心编排
目标：
- 前台聊天
- 五类高风险规则
- RAG 检索
- mock 工具调用

产出：
- 主流程可跑通

## P2 后台与闭环
目标：
- 人工接管台
- 运营控制台 + A/B Test 实验台
- 记忆库
- 评测面板

产出：
- 形成可演示闭环

## P3 优化
目标：
- rerank
- 更细指标
- 真实工具接入
- 真实文档替换

---

## 17. 建议的代码仓库结构

```text
/apps
  /web-customer
  /web-admin
  /api
/packages
  /orchestrator
  /policy-engine
  /rag-core
  /shared-types
  /ui
/data
  /seed
  /docs
/scripts
  seed-loader.ts
  build-index.ts
  run-evals.ts
  generate_portfolio_assets.py
```

---

## 18. 明确不做的事情
- 不做开放域百科型问答
- 不做“模型自己决定所有售后政策”
- 不做没有引用的兼容 / 保修结论
- 不做自动图片判责直接退款

---

## 19. 给 coding agent 的直接执行顺序

1. 完成 `seed-loader`、数据库 schema、RAG 入库与 `/api/chat/messages` 的 mock 编排
2. 实现五类高风险场景的规则引擎与必需文档校验
3. 实现会话与取证一体页，确保能跑通完整会话和取证流程
4. 实现人工接管台、运营控制台（含 A/B 实验台）与 eval runner
5. 每一步都必须附带：
   - 可运行 demo
   - 种子数据
   - 接口说明
   - 验收截图

---

## 20. 附录：当前关键数据源映射
- `knowledge_domains`：知识域定义
- `country_power_matrix`：国家 / 地区电压频率插头矩阵
- `brand_master_20`：品牌主数据
- `category_master_10`：类目主数据
- `sku_master_60`：SKU 主数据
- `install_condition_templates`：安装条件模板
- `warranty_region_matrix`：保修地域矩阵
- `damage_signoff_rules`：签收破损规则
- `price_dispute_rules`：降价争议规则
- `field_specs_priority5`：字段规范
- `eval_batch1_priority5`：首批评测集
- `rag_doc_registry`：RAG 文档元信息
- `rag_source_docs_v2.jsonl`：RAG 正文种子
