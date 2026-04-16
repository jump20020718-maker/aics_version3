// ============================================================
// LLM 通用类型定义
// 所有 provider 适配器共享此接口，方便扩展新模型
// ============================================================

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamOptions {
  /** 平台标识，决定走哪个适配器：openai / anthropic / zhipu / siliconflow / minimax / google / moonshot / deepseek / custom */
  provider: string;
  /** API 请求地址，留空时使用 provider 默认地址 */
  baseUrl: string;
  /** API Key */
  apiKey: string;
  /** 模型 ID，如 "gpt-4o"、"claude-opus-4-6"、"glm-4-flash" */
  modelId: string;
  /** 消息列表（包含 system 消息） */
  messages: LLMMessage[];
  /** 温度，默认 0.3 */
  temperature?: number;
  /** 最大 token，默认 2048 */
  maxTokens?: number;
  /** 中断信号 */
  signal?: AbortSignal;
}

export type LLMChunkType = "delta" | "done" | "error";

export interface LLMChunk {
  type: LLMChunkType;
  /** 文本增量（type=delta 时有效） */
  delta?: string;
  /** 用量统计（type=done 时可选） */
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
  /** 错误信息（type=error 时有效） */
  error?: string;
}

// ============================================================
// Provider 元数据（用于前端展示 + 路由决策）
// ============================================================

export interface ProviderPreset {
  /** 展示名称（中文） */
  name: string;
  /** 默认 API 基础地址 */
  defaultBaseUrl: string;
  /** 使用的 SDK 适配器类型 */
  sdk: "openai-compat" | "anthropic";
  /** 常见模型 ID 供前端下拉选择 */
  models: string[];
  /** 官方文档地址 */
  docsUrl?: string;
}
