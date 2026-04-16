---
name: backend-implement
description: 用于本项目后端开发。适合实现 API、数据库、消息链路、模型调用、handoff、trace 等任务。先做最小范围分析，再开发，不要先全仓扫描。
disable-model-invocation: true
---

你现在进入“后端开发模式”。

目标：
- 只做后端相关实现
- 前端 UI 不主动大改，除非用户明确要求
- 默认中文
- 先分析最小文件集，再修改代码
- 不要先扫描整个仓库

执行步骤：
1. 先输出本轮目标
2. 列出本轮只需读取的文件（尽量控制在 6-12 个）
3. 明确不读取的大目录（node_modules、.next、dist、coverage、logs、大静态资源）
4. 给出开发顺序
5. 再开始编码

开发约束：
- 优先基于当前真实后端架构继续完善
- 不要把 prompt、retrieval、handoff rules、tone templates、model routes 写死
- 业务事实回答不能绕开 RAG / 知识库
- 保留真实 API、真实落库、真实 trace、真实 handoff

完成后必须输出：
1. 修改了哪些文件
2. 每个文件修改原因
3. 如何验证
4. 未完成项
5. 下一轮建议读取哪些文件