跨境进口家电 AI 客服 RAG 深化包 v2

文件说明：
1. 跨境进口家电AI客服_RAG底稿深化_v2.xlsx
   - 在原RAG底稿基础上新增真实文档清单、字段规范、首批评测集、60 SKU/20品牌/10类目种子数据源。
2. rag_source_docs_v2.jsonl
   - 220条合成RAG文档，包含SKU事实卡、兼容安装卡、品牌保修政策、签收破损SOP、降价争议政策、客服需求画像。
3. sku_master_60.csv
   - 60个SKU主数据。
4. real_doc_checklist.csv
   - 197条上线前需替换/补采的真实文档清单。
5. eval_batch1_priority5.csv
   - 100条首批评测数据。
6. field_specs_priority5.json
   - 5类高优先主题的字段规范JSON。

重要说明：
- 本包中的业务数据为 synthetic_seed，仅用于RAG联调、评测、原型演示。
- 正式上线前，必须替换为品牌官方文档、内部政策与系统真数。
- 事实输出边界：只有RAG命中、工具返回、人工确认记忆库内容可作为事实输出。
