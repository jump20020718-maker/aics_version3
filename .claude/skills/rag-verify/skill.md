---
name: rag-verify
description: 用于检查本项目的 RAG、citation、知识库检索、业务事实回答是否真实可靠。适合在完成消息链路或模型调用后做专项验证。
disable-model-invocation: true
---

你现在进入“RAG 校验模式”。

任务：
- 检查回答是否基于知识库 / 检索结果
- 检查 citation 是否存在且可追溯
- 检查兼容性、保修、退换、物流承诺、赔付规则等业务事实是否绕开了知识库
- 检查 retrieval -> generation -> persistence 链路是否真实

执行步骤：
1. 先列出需要查看的最小文件集
2. 找出 RAG 数据源、检索逻辑、citation 保存逻辑、前端展示逻辑
3. 列出问题清单
4. 按优先级给出修复建议
5. 如用户要求，再实施修复

输出格式：
- 当前 RAG 是否真实接通
- citation 是否真实可追溯
- 哪些回答仍在“裸答”
- 需要修改的文件
- 验证方法