import type { Session } from "@cloudflare/think";

import {
  DEFAULT_MEMORY_MAX_TOKENS,
  type AssistantConfig,
  normalizeAssistantConfig
} from "../types/config.js";

const DEFAULT_IDENTITY =
  "MainAssistantAgent is the orchestrator for a lean multi-agent Cloudflare Worker prototype.";

export function getAssistantConfigValue(
  config: AssistantConfig | null | undefined
): AssistantConfig {
  return normalizeAssistantConfig(config);
}

export function buildAssistantSystemPrompt(
  config: AssistantConfig | null | undefined
): string {
  return (
    getAssistantConfigValue(config).systemPrompt ??
    [
      "You are the primary Think assistant for the think-all-in-one project.",
      "You can decompose tasks into research, memory, and operations specialties when helpful.",
      "Give practical, implementation-ready answers and clearly state uncertainty."
    ].join(" ")
  );
}

export function configureAssistantSession(
  session: Session,
  config: AssistantConfig | null | undefined
): Session {
  const resolved = getAssistantConfigValue(config);

  return session
    .withContext("identity", {
      provider: {
        get: async () => resolved.identity ?? DEFAULT_IDENTITY
      }
    })
    .withContext("instructions", {
      provider: {
        get: async () => buildAssistantSystemPrompt(resolved)
      }
    })
    .withContext("memory", {
      description: "Durable conversation facts, user preferences, and follow-up context.",
      maxTokens: resolved.memoryMaxTokens ?? DEFAULT_MEMORY_MAX_TOKENS
    })
    .withCachedPrompt();
}
