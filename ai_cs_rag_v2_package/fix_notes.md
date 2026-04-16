# RAG 底稿 v2 → v3 修复说明（Task 1）

**执行时间**：2026-04-14 ~ 2026-04-15
**执行人**：AI 产品经理（Claude）
**对应计划**：`C:\Users\JUMP\.claude\plans\mutable-greeting-oasis.md` → Task 1
**原评审**：`C:\Users\JUMP\.claude\plans\deep-leaping-sphinx.md`

---

## 0. 为什么要做这次修复

v2 底稿存在两类问题，共同导致其**不能直接进 RAG 联调**：

1. **Schema 层面**：字段语义重叠、类型不一致、同一字段三义、枚举不统一、缺少元数据治理字段 → 任何检索/裁决/置信度逻辑都无法可靠落地。
2. **背景错配**：v2 沿用的是"跨境=卖给欧美日用户"的旧视角。真实场景是**中国大陆用户买东南亚低价家电 / 小电器带出国**，v2 的 SKU 卡、保修卡、兼容卡都没有"在中国使用"这一层信息，也没有"进口商保修 vs 品牌联保"的区分，也没有"不支持 7 天无理由"的销售规则披露。

本次修复按照原评审 P0 3.1/3.2/4.1/4.2 的诊断，配合用户补充的新背景，做了四件事：

- **规范化 Schema**（去三义 / 去枚举歧义 / 加治理元数据）
- **修复自相矛盾**（至少 7 类已发现的冲突）
- **补中国背景字段**（china_usability / warranty_type / sales_rule_return 等）
- **新增 3 类 doc_type**（import_warranty_card / shipping_eta_card / travel_use_card）

---

## 1. 数量总览

| 资产 | v2 原始 | v3 修复后 | 变化 |
|------|---------|-----------|------|
| `rag_source_docs_v2.jsonl` | 220 条 | **310 条** | +90（60 进口保修 + 10 运输时效 + 20 带出国使用） |
| `sku_master_60.csv` | 60 行 × 23 列 | 60 行 × **33 列** | +10 列新字段 |
| `field_specs_priority5.json` | 54 条 | **78 条** | +24 条新字段规范 |
| `real_doc_checklist.csv` | 197 条 | **287 条** | +90 条（与 jsonl 同步扩充） |
| `rag_schema_v3.json` | 不存在 | **新建** | JSON Schema Draft 2020-12，含跨字段一致性 allOf 规则 |

**v3 jsonl 的 doc_type 分布**（共 310 条）：

| doc_type | 数量 | 说明 |
|----------|------|------|
| `sku_fact_card` | 60 | SKU 事实卡（新增 china_* / warranty_* / sales_rule_*） |
| `compatibility_install_card` | 60 | 兼容安装卡（country_scope 拆分为 supported_use_countries，规则已默认含 CN-mainland） |
| `service_need_profile` | 60 | 客服需求画像 |
| `import_warranty_card` | 60 | **新增**：每 SKU 一条进口保修政策 |
| `warranty_region_policy` | 20 | 品牌保修政策（country_scope 拆分为 warranty_scope_type + valid_regions） |
| `travel_use_card` | 20 | **新增**：小电器带出国使用（白名单 20 SKU） |
| `damage_signoff_sop` | 10 | 签收破损 SOP |
| `price_dispute_policy` | 10 | 降价争议政策 |
| `shipping_eta_card` | 10 | **新增**：按品类的运输时效说明 |

---

## 2. Schema 规范化（所有 310 条）

### 2.1 字段重命名与类型纠正

| 原字段 | 问题 | 新字段/做法 |
|--------|------|-------------|
| `priority_topic: "电压/频率/插头兼容\|安装条件"` | 伪数组（竖线分隔字符串） | `priority_topics: ["电压/频率/插头兼容","安装条件"]` — 改为真数组 |
| `replace_with_real_doc: "Y"` / `"N"` | Y/N 字符串 | `replace_with_real_doc: true` / `false` — 真 boolean |
| `installation_requirements.ventilation_required: "Y"` 等 | Y/N 字符串 & 偶发自由文本 | 主要 Y/N 字段转 boolean；少数自由文本（如"部分烘干机Y"）保留为 string。Schema 允许 `["boolean","string"]` |
| `source_type: "synthetic_seed"` vs checklist 里 `synthetic_backlog` | 枚举不统一 | 统一为 `synthetic_seed`；checklist 新增独立字段 `collection_status: "pending"` 承载"待收集"语义 |

### 2.2 `country_scope` 拆分（修复三义词）

**问题**：同一字段在三类 doc 中含义完全不同 → 检索/裁决必然出错。

| doc_type | v2（有歧义） | v3（拆分后） |
|----------|--------------|--------------|
| `sku_fact_card` | `country_scope: ["US","CA"]`（其实是版本国） | `version_country: "US"` + `sales_regions: ["CN-mainland"]` |
| `compatibility_install_card` | `country_scope: ["US","CA","UK","EU","JP","AU","AE","SG"]`（其实是"回答过的国家"） | `supported_use_countries: [...]`，**规则数组默认含 `CN-mainland` 条目** |
| `warranty_region_policy` | `country_scope: [...]`（其实是保修有效地） | `warranty_scope_type: "importer_only"` / `"importer_with_brand_support"` / `"brand_global"` + `valid_regions: [...]` |

全部 220 条 v2 文档中的 `country_scope` 字段已从 doc 对象删除，替换为上面三组语义明确的字段。

### 2.3 治理元数据（新增，全部 310 条）

```json
{
  "locale": "zh-CN",
  "source_of_truth_tier": "tier3_synthetic",
  "confidence_ceiling": 0.5,
  "data_provenance": {
    "origin": "synthetic_v2_seed",
    "collected_at": "2026-04-15T10:00:00+08:00",
    "collector": "v2_seed_generator"
  },
  "subject_risk_level": "高",
  "data_risk_level": "high_synthetic_only",
  "created_at": "2026-04-15T10:00:00+08:00",
  "updated_at": "2026-04-15T10:00:00+08:00",
  "version": "v3.0.0",
  "expires_at": "2026-05-15T10:00:00+08:00"   // 仅政策类 30 天 TTL
}
```

**关键设计**：

- `source_of_truth_tier` 四级：`tier1_official` / `tier2_supplier` / `tier3_synthetic` / `tier4_user_generated`
- `confidence_ceiling` 由 tier 决定：1.0 / 0.8 / **0.5** / 0.3 — 合成数据最高 0.5，**强制禁止**在用户面前以高置信输出
- `subject_risk_level` vs `data_risk_level` 拆分：前者是"主题本身的业务风险"（如保修/赔付属于高风险主题），后者是"当前数据可信度"（合成数据本身 high_synthetic_only）。v2 把两者混成一个 `risk_level` 字段。
- `expires_at` 仅加在政策类（warranty_region_policy / price_dispute_policy / damage_signoff_sop），30 天 TTL，强制政策内容定期复核

---

## 3. 自相矛盾修复（7 类）

### 3.1 DOC-SKU-DELO-Bean-US-COMPAT：插头一致却判"人工复核"

**v2 状态**：`plug_type: "Type A/B"` + 规则 `verdict: "manual_review"` + `reason: "插头不一致"` — 明显自相矛盾（B 插头匹配 A/B 插座）。

**v3 修复**：US/CA 条目改为 `verdict: "compatible"`，并新增 CN-mainland 条目 `verdict: "need_transformer_and_adapter"`（120V → 220V 变压器 + Type B → GB 2099 转接头）。

### 3.2 DOC-SKU-DELO-Caps-UK-FACT：版本国与市场国错位

**v2 状态**：`country_scope: ["UK","AE","SG"]` 但 `sku_master.target_market_region: "UK"` — 一个 SKU 同时"发往三国"与"只发英国"。

**v3 修复**：拆分后 `version_country: "UK"`（设计版）+ `sales_regions: ["CN-mainland"]`（实际在中国销售）。原字段已从所有 sku_fact_card 中移除。

### 3.3 所有 60 条 sku_fact_card 的 `risk_level: "高"`

**v2 问题**：一条合成卡直接标"高风险"会被误判为"必须用高置信呈现"。但它的来源只是 `synthetic_seed`，置信度应该是 0.5 封顶。

**v3 修复**：拆成两个字段 —
- `subject_risk_level: "高"`（主题是贵家电 → 业务高风险 → 要求高严谨度）
- `data_risk_level: "high_synthetic_only"`（数据本身是合成 → 禁止向用户输出承诺性话术）

### 3.4 warranty_region_policy 与 SKU 脱链

**v2 问题**：保修政策 doc 只有 `brand_id`，没有 `sku_id`，检索时无法从 SKU 反向找到适用的保修政策。

**v3 修复**：在所有 20 条 warranty_region_policy 上新增 `linked_sku_ids: [...]` 字段，列举该品牌下本库内所有 SKU（基于 sku_master 同品牌筛选）。

### 3.5 priority_topic 220 条全部相同

**v2 问题**：所有 220 条的 `priority_topic` 都是 `"电压/频率/插头兼容|安装条件"`，完全没有区分度 — 检索时无法用作主题过滤。

**v3 修复**：按 doc_type 差异化 priority_topics —

| doc_type | priority_topics |
|----------|-----------------|
| `sku_fact_card` | 规格参数 / 在中国使用 / 进口保修 |
| `compatibility_install_card` | 电压/频率/插头兼容 / 安装条件 / 在中国使用 |
| `warranty_region_policy` | 品牌保修 / 进口商保修 / 维修网点 |
| `import_warranty_card` | 进口保修 / 质保时效 / 七天无理由 |
| `damage_signoff_sop` | 签收取证 / 破损处理 / 举证时限 |
| `price_dispute_policy` | 降价争议 / 价保政策 / 补差规则 |
| `service_need_profile` | 客服场景 / 用户意图 / 常见问题 |
| `shipping_eta_card` | 运输时效 / 清关 / 送达预期 |
| `travel_use_card` | 带出国使用 / 目的国电源 / 插头转换 |

### 3.6 `source_type` 枚举不统一

**v2 问题**：jsonl 用 `synthetic_seed`、checklist 用 `synthetic_backlog`，同一语义两种写法。

**v3 修复**：
- jsonl 统一使用 `synthetic_seed`
- checklist 新增 `collection_status: "pending" / "collecting" / "verified"` 承载"待收集"语义
- checklist 里所有 `synthetic_backlog` 值已被替换为 `synthetic_seed`

### 3.7 `verdict` 枚举不稳定（Task 1 中途才暴露）

**v2 状态**：compat_rules 的 verdict 字段偶发 `direct_use` / `converter_required` / `manual_review`，与新 schema 的 `compatible` / `need_adapter` / `need_transformer` / `need_transformer_and_adapter` / `not_recommended` / `manual_review` 枚举不一致。

**v3 修复**：在 transform 脚本里加入 old_verdict_map：
- `direct_use` → `compatible`
- `converter_required` → `need_transformer_and_adapter`
- `manual_review` → 默认保留，但在明确插头兼容的情况下改为 `compatible`

---

## 4. 基于新背景的重新定位（核心改动）

### 4.1 `sku_fact_card.facts` 新字段（60 条全部补齐）

#### 中国使用信息

| 字段 | 取值 | 含义 |
|------|------|------|
| `china_usability` | `direct` / `need_adapter` / `need_transformer` / `need_transformer_and_adapter` / `not_recommended` | 在中国大陆能否使用的结论 |
| `china_voltage_note` | 自由文本，如"110V 进口版，需配 220V→110V 变压器"或"220-240V 全球宽压，中国直接可用电压" | 电压解释 |
| `china_plug_adapter` | 自由文本，如"Type B → GB 2099 转接头"或"Type I 插头与中国三孔插座兼容" | 插头适配说明 |

**分类规则**（代码里 `classify_china_usability` 函数）：

1. 电压不匹配（100V/120V）且属于"常开大家电"（冰箱/烟机）→ `not_recommended`
2. 电压不匹配且属于"重型厨电"（洗碗机/烤箱/微波炉/洗衣机）或功率 >1500W → `not_recommended`
3. 其他电压不匹配情形：
   - 如果插头也不兼容 → `need_transformer_and_adapter`
   - 如果插头可兼容（少数情况） → `need_transformer`
4. 电压匹配（220-240V）：
   - 如果是 Type I 插头 → `direct`
   - 其他插头 → `need_adapter`

**实际分布**（60 条）：
- `need_adapter`: **41 条**（220V 欧规/英规 SKU，换头即可）
- `not_recommended`: **11 条**（美版大家电为主）
- `need_transformer_and_adapter`: **6 条**（120V 小/中家电）
- `direct`: **2 条**（本身就是 Type I 或国标）

#### 进口保修信息

| 字段 | 取值 | 默认 |
|------|------|------|
| `warranty_type` | `importer_only` / `importer_with_brand_support` / `brand_global` | 90% 为 `importer_only` |
| `warranty_duration_days` | 数字 | 一般 365 天 |
| `return_policy_type` | `quality_issue_only` / `7_day_no_reason_supported` | **全部为 `quality_issue_only`** |
| `import_channel` | `official_distributor` / `parallel_import` / `gray_market` | 按品牌映射 |

#### 销售规则（契合新背景）

| 字段 | 取值 |
|------|------|
| `sales_rule_return` | 固定文案："不支持七天无理由退换，仅在质量问题且在申报时限内可退换货" |
| `sales_rule_return_window_days` | 数字，默认 15（从签收起 15 天内申报质量问题有效） |

### 4.2 新增 doc_type 及其生成规则

#### 4.2.1 `import_warranty_card`（60 条，每 SKU 一条）

```
doc_id 格式：DOC-SKU-{sku_code}-IMPORT-WTY
关键字段：
  - importer_name（按品牌映射，如 "上海跨境进出口有限公司"）
  - importer_type（"official_distributor" / "parallel_import"）
  - warranty_scope_type（"importer_only" / "importer_with_brand_support" / "brand_global"）
  - warranty_duration_days
  - claim_channel（"importer_aftersales_only" / "brand_authorized_service"）
  - return_policy_type: "quality_issue_only"
  - return_window_days: 15
  - disclosure_required: true（销售页必须披露）
```

**为什么要独立**：v2 的 warranty_region_policy 按品牌（20 条）组织，而用户 99% 的提问是"这台机器能保修多久" — 必须有 SKU 级别的快速卡。

#### 4.2.2 `shipping_eta_card`（10 条，按品类）

```
doc_id 格式：DOC-SHIP-{category}
关键字段：
  - category（10 个大类，对应 sku_master 的品类）
  - shipping_info:
      - eta_days_min / eta_days_max（海运 10-21 天，空运 5-10 天等）
      - shipping_mode（"sea_freight" / "air_freight"）
      - customs_clearance_days（平均 2-5 天）
      - tracking_visibility（"tracked" / "partially_tracked"）
      - delay_reasons（常见延误原因清单）
  - proactive_explain_template（主动话术模板）
```

**为什么要独立**：运输焦虑是跨境消费的顶级焦点 — 被动回答"大概 15 天"会翻车，需要"为什么慢 + 哪几天在哪 + 如何追查"的模板。

#### 4.2.3 `travel_use_card`（20 条，白名单 SKU）

**白名单 SKU**（20 个可能被带出国的小电器）：
- 6 个空气净化器（保湿/便携型）
- 6 个扫地机器人/吸尘器（含手持款）
- 6 个水壶/料理机/破壁机
- 2 个胶囊咖啡机

```
doc_id 格式：DOC-SKU-{sku_code}-TRAVEL
关键字段：
  - travel_info:
      - travel_target_countries（["SG","MY","TH","JP","AU","US"]）
      - per_country_usability: {
          "SG": "direct" / "need_adapter" / ...,
          "MY": ...,
          ...
        }
      - plug_adapter_hint
      - voltage_hint
      - battery_iata_limit（锂电池航空限运）
  - advisory_required: true（导购场景必须主动给出建议）
```

**为什么要独立**：虽然是次要场景，但一旦触发就是"小金额高摩擦"的典型场景 — 带着机器出关发现不能用是客诉重灾区。

### 4.3 `compatibility_install_card` 的变化

- v2 只覆盖了 8 个国家（US/CA/UK/EU/JP/AU/AE/SG），**没有 CN-mainland**
- v3 强制每条 compat_rule 数组**必含 CN-mainland 条目**，verdict 由上面 classify_china_usability 推导
- 拆分 `country_scope` → `supported_use_countries: ["CN-mainland", "US", ...]`

---

## 5. 新增字段规范（24 条，field_specs 从 54 → 78）

新字段按 6 组分类：

| 组 | 字段数 | 字段 |
|----|--------|------|
| 中国使用 | 3 | china_usability, china_voltage_note, china_plug_adapter |
| 进口保修 | 2 | warranty_type, warranty_duration_days |
| 销售规则 | 4 | return_policy_type, import_channel, sales_rule_return, sales_rule_return_window_days |
| 运输时效 | 5 | eta_days_min, eta_days_max, shipping_mode, customs_clearance_days, delay_reasons |
| 带出国使用 | 4 | travel_target_countries, per_country_usability, plug_adapter_hint, battery_iata_limit |
| 元数据治理 | 6 | locale, source_of_truth_tier, confidence_ceiling, data_provenance, subject_risk_level, data_risk_level |

每条字段规范统一包含：字段名 / 类型 / 枚举/范围 / 业务含义 / 必填性 / 默认值 / 示例。

---

## 6. real_doc_checklist.csv 的变化

- 条目数：197 → **287**（+90 条新 doc_type 对应的真实文档收集项）
- 新增列：
  - `doc_type`（对齐 jsonl 的 9 类）
  - `locale`（统一 `zh-CN`）
  - `source_of_truth_tier_target`（目标 tier：tier1/tier2）
  - `collection_status`（`pending` / `collecting` / `verified`，本次全部置 `pending`）
- 旧列 `source_type` 从 `synthetic_backlog` 统一改为 `synthetic_seed`
- 新增 90 条条目：60 个 SKU 的 `import_warranty_card` 采集项 + 10 个品类的 `shipping_eta_card` 采集项 + 20 个白名单 SKU 的 `travel_use_card` 采集项

---

## 7. 做了什么 / 不做什么

### 做了
- [x] 所有 220 条 v2 doc 的 schema 规范化 + 元数据补齐
- [x] 7 类自相矛盾的已发现问题全部修复
- [x] 60 条 sku_fact_card 补中国使用字段 + 进口保修字段 + 销售规则字段
- [x] 60 条 compatibility_install_card 强制加 CN-mainland 规则条目
- [x] 新增 60 + 10 + 20 = 90 条新 doc_type 文档
- [x] 60 行 sku_master 补 10 列新字段
- [x] field_specs_priority5.json 补 24 条新字段规范
- [x] real_doc_checklist 补 90 条新采集项 + 4 列新列 + 枚举统一
- [x] 新建 `rag_schema_v3.json`（Draft 2020-12，含跨字段 allOf 约束）
- [x] 310 条 doc 全部通过 Draft202012 schema 校验（0 error）
- [x] 原始文件备份到 `_backup_20260414_154018/`

### 不做（范围外）
- [ ] `跨境进口家电AI客服_RAG底稿深化_v2.xlsx` — 它是镜像视图，用户可基于 v3 数据自行重新生成
- [ ] 197 条"真实文档"的实际收集 — 那是线下采集任务
- [ ] 任何 embedding / retrieval / LLM 代码 — 纯数据修复
- [ ] 评测集（`eval_batch1_priority5.csv`）— 属于 Task 2

---

## 8. 验证步骤（可复现）

### 8.1 jsonl 格式 + 条数

```bash
cd "D:/个人知识库/个人知识库/AI产品经理/ai客服家电/ai_cs_rag_v2_package"
python -c "import json; docs=[json.loads(l) for l in open('rag_source_docs_v2.jsonl', encoding='utf-8')]; print('total docs:', len(docs))"
```
预期：`total docs: 310`

### 8.2 doc_type 分布

```bash
python -c "
import json, collections
docs = [json.loads(l) for l in open('rag_source_docs_v2.jsonl', encoding='utf-8')]
for k, v in sorted(collections.Counter(d['doc_type'] for d in docs).items()):
    print(k, v)
"
```
预期输出（共 9 类，总 310）：
```
compatibility_install_card 60
damage_signoff_sop 10
import_warranty_card 60
price_dispute_policy 10
service_need_profile 60
shipping_eta_card 10
sku_fact_card 60
travel_use_card 20
warranty_region_policy 20
```

### 8.3 JSON Schema 校验

```bash
python -c "
import json
from jsonschema import Draft202012Validator
schema = json.load(open('rag_schema_v3.json', encoding='utf-8'))
v = Draft202012Validator(schema)
docs = [json.loads(l) for l in open('rag_source_docs_v2.jsonl', encoding='utf-8')]
errs = [(d.get('doc_id'), e.message) for d in docs for e in v.iter_errors(d)]
print('total errors:', len(errs))
"
```
预期：`total errors: 0`

### 8.4 china_usability 分布抽查

```bash
python -c "
import json, collections
docs = [json.loads(l) for l in open('rag_source_docs_v2.jsonl', encoding='utf-8')]
chinas = [d['facts']['china_usability'] for d in docs if d['doc_type']=='sku_fact_card']
print(collections.Counter(chinas))
"
```
预期：`Counter({'need_adapter': 41, 'not_recommended': 11, 'need_transformer_and_adapter': 6, 'direct': 2})`

### 8.5 DELO-Bean-US 冲突修复抽查

```bash
python -c "
import json
docs = [json.loads(l) for l in open('rag_source_docs_v2.jsonl', encoding='utf-8')]
for d in docs:
    if d.get('doc_id') == 'DOC-SKU-DELO-Bean-US-COMPAT':
        for r in d.get('compatibility_rules', []):
            if r.get('country') in ('US', 'CN-mainland'):
                print(r.get('country'), '->', r.get('verdict'))
"
```
预期：
```
CN-mainland -> need_transformer_and_adapter
US -> compatible
```

### 8.6 sku_master 新列

```bash
python -c "
import csv
with open('sku_master_60.csv', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    print('columns:', len(reader.fieldnames))
    print('new cols:', [c for c in reader.fieldnames if c in ('china_usability','warranty_type','return_policy_type','sales_rule_return','sales_rule_return_window_days','importer_name')])
"
```
预期：`columns: 33` 且新列全部在 fieldnames 中

---

## 9. 对原评审 P0 的回应映射

| 原评审 P0 编号 | 问题 | 本次修复 |
|--------------|------|---------|
| P0 3.1 RAG 数据矛盾 | 60 SKU 与 220 doc 信息不一致，跨文档证据链断裂 | §3 + warranty linked_sku_ids + compat_rules 含 CN-mainland |
| P0 3.2 评测样例缺多样性 | 100 条全是简单 QA，无边界 | **留给 Task 2**（见 Task 2 计划） |
| P0 4.1 RAG Schema 混乱 | country_scope 三义，priority_topic 伪数组，risk_level 混义 | §2.1 + §2.2 + §3.3 |
| P0 4.2 信任度隔离 | 没有"合成 vs 真实"隔离 | §2.3 新增 source_of_truth_tier + confidence_ceiling |

**新背景下的新 P0**（非原评审涵盖）：

| 新 P0 | 修复 |
|------|------|
| 进口商 vs 品牌保修边界 | §4.1 warranty_type + §4.2.1 import_warranty_card 新 doc_type |
| 不支持 7 天无理由的合规披露 | §4.1 return_policy_type = "quality_issue_only" + sales_rule_return |
| 运输周期焦虑话术 | §4.2.2 shipping_eta_card 新 doc_type |
| 带出国使用场景 | §4.2.3 travel_use_card 新 doc_type |

---

## 10. 备份与回滚

### 10.1 备份位置

```
D:/个人知识库/个人知识库/AI产品经理/ai客服家电/ai_cs_rag_v2_package/_backup_20260414_154018/
  ├── rag_source_docs_v2.jsonl（v2 原始，220 条）
  ├── sku_master_60.csv（v2 原始，23 列）
  ├── field_specs_priority5.json（v2 原始，54 条）
  ├── real_doc_checklist.csv（v2 原始，197 条）
  └── eval_batch1_priority5.csv（v2 原始 100 条，Task 1 未改动）
```

### 10.2 回滚方式

若需完全回到 v2 状态：

```bash
cd "D:/个人知识库/个人知识库/AI产品经理/ai客服家电/ai_cs_rag_v2_package"
cp _backup_20260414_154018/rag_source_docs_v2.jsonl .
cp _backup_20260414_154018/sku_master_60.csv .
cp _backup_20260414_154018/field_specs_priority5.json .
cp _backup_20260414_154018/real_doc_checklist.csv .
rm rag_schema_v3.json fix_notes.md
```

### 10.3 脚本

`_transform_v2_to_v3.py` 是本次修复使用的一次性转换脚本。
- 保留在仓库中作为**修复逻辑的可执行文档**，方便后续若 v2 源数据更新时重跑
- 运行前先执行 10.2 回滚步骤恢复 v2 源数据，再 `python _transform_v2_to_v3.py`
- 脚本是幂等的（同样输入 → 同样输出）

---

## 11. Task 1 交付物清单

| 文件 | 动作 | 状态 |
|------|------|------|
| `rag_source_docs_v2.jsonl` | 覆盖 | ✅ 310 条，schema 校验 0 error |
| `sku_master_60.csv` | 覆盖 | ✅ 60 × 33 |
| `field_specs_priority5.json` | 覆盖 | ✅ 78 条 |
| `real_doc_checklist.csv` | 覆盖 | ✅ 287 条 |
| `rag_schema_v3.json` | 新建 | ✅ Draft 2020-12 + allOf |
| `fix_notes.md` | 新建 | ✅ 本文档 |
| `_backup_20260414_154018/` | 新建 | ✅ 原 5 文件 |
| `_transform_v2_to_v3.py` | 新建（辅助脚本，保留） | ✅ 幂等 |

---

**Task 1 完成。等待 review 后进入 Task 2（评测样例扩充 100 → 160）。**
