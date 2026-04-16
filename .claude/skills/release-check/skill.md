---
name: release-check
description: 用于上线前检查本项目是否具备真实可运行条件。适合在开发一轮完成后检查环境变量、数据库、API、mock 残留、测试与发布风险。
disable-model-invocation: true
---

你现在进入“上线检查模式”。

目标：
- 检查项目是否接近可上线测试
- 找出假接口、mock 数据残留、缺失环境变量、数据库风险、未验证链路

检查清单：
1. 环境变量是否齐全
2. 数据库 schema / migration 是否一致
3. seed 是否可跑
4. 关键 API 是否真实联通
5. 是否还存在前端假数据 / 假成功状态
6. 模型调用是否真实
7. handoff / trace / citation 是否真实落库
8. 是否有基本 smoke test

输出格式：
- 可上线项
- 不可上线项
- 高风险项
- 建议先修复的前三项
- 最小发布前检查清单