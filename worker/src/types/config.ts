export interface AssistantConfig {
  model?: string;
  systemPrompt?: string;
  identity?: string;
  memoryMaxTokens?: number;
}

export const DEFAULT_MEMORY_MAX_TOKENS = 1500;

export function normalizeAssistantConfig(
  config: Partial<AssistantConfig> | null | undefined
): AssistantConfig {
  if (!config) {
    return {};
  }

  return {
    model: config.model,
    systemPrompt: config.systemPrompt,
    identity: config.identity,
    memoryMaxTokens: config.memoryMaxTokens
  };
}
