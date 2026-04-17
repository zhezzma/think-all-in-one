export interface AssistantConfig {
  model?: string;
  systemPrompt?: string;
  identity?: string;
  memoryMaxTokens?: number;
  profileId?: string;
  enabledTools?: string[];
  enabledExtensions?: string[];
}

export const DEFAULT_MEMORY_MAX_TOKENS = 1500;

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return [...new Set(value.map((entry) => normalizeString(entry)).filter((entry): entry is string => !!entry))]
    .sort((left, right) => left.localeCompare(right));
}

export function normalizeAssistantConfig(
  config: Partial<AssistantConfig> | null | undefined
): AssistantConfig {
  if (!config) {
    return {};
  }

  return {
    model: normalizeString(config.model),
    systemPrompt: normalizeString(config.systemPrompt),
    identity: normalizeString(config.identity),
    memoryMaxTokens: typeof config.memoryMaxTokens === "number" ? config.memoryMaxTokens : undefined,
    profileId: normalizeString(config.profileId),
    enabledTools: normalizeStringArray(config.enabledTools),
    enabledExtensions: normalizeStringArray(config.enabledExtensions)
  };
}
