# CLAUDE.md

## 项目定位
这是一个电商 AI 客服系统项目。
目标不是做纯展示 demo，也不要包装成“真实商用已全面上线”的系统。

当前目标：
- 做出可真实联调、可真实调用模型、可真实落库、可真实追踪的 AI 客服系统
- 前端展示以`mock_ui/`中的更成熟、更好看的 UI 风格为主
- 后端实现以当前已经接入真实 API 的版本为主，继续补齐缺失能力
- 默认中文展示，尽量避免英文文案出现在用户界面和控制台

## 冲突时的优先级
发生冲突时，按以下顺序决策：
1. 用户本轮最新明确要求
2. `PRD_v3_final.md`
3. 当前真实后端代码和数据库 schema
4. `mock_ui/` 中旧版更成熟的页面与交互
5. seed / mock / RAG 数据
6. 历史仓库或历史页面

## 当前明确取舍
- 前端 UI：以旧版更好看的风格和交互为主
- 后端实现：以当前真实 API 架构为主
- 默认语言：中文
- 业务事实：以 RAG / 规则 / 数据库为准，不要编造

## 关键业务约束
以下内容不要绕开知识库 / 检索 / 规则直接回答：
- 保修
- 退换规则
- 兼容性
- 配送承诺
- 清关 / 物流承诺
- 赔付边界

业务事实回答必须可追溯 citation。

## 当前系统必须具备的真实能力
- 能创建新的测试顾客
- 能创建/读取真实会话
- 能在新顾客窗口发起真实 AI 对话
- 能支持多顾客并行会话，不互相串线
- 用户消息和 assistant 回复真实入库
- 保存 reasoning / citation / tool call / providerRequestId / realModelCall
- 支持 trace 回看
- 支持 handoff 与 callback note

## Console 要求
以下页面必须是真实后端读写，不是本地 mock：
- Prompts
- Settings
- Models
- Route Plans
- Retrieval
- Handoff Rules
- Tone Templates
- Knowledge
- Experiments
- Badcases
- Eval

## 红线
不要把以下内容写死在代码里：
- prompt
- retrieval strategy
- handoff rules
- tone templates
- model routes
- experiments
- provider choice

不要只改前端展示，不接真实 API。
不要只做按钮交互，不做真实业务链路。
不要把 mock reply 伪装成真实模型结果。
不要为了“更现代”随意改掉旧版成熟 UI 的信息密度和工作台风格。