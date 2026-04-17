import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";

const mockBaseContinueLastTurn = vi.fn(async (body?: Record<string, unknown>) => ({
  requestId: body ? "req-continue" : "req-skip",
  status: body ? "completed" as const : "skipped" as const
}));

vi.mock("@cloudflare/think", () => ({
  Think: class Think<Env = unknown, Config = Record<string, unknown>> {
    env!: Env;
    session = { refreshSystemPrompt: vi.fn(async () => "prompt") };
    getSystemPrompt() {
      return "";
    }
    getConfig(): Config | null {
      return null;
    }
    configure(_config: Config) {}
    configureSession(session: unknown) {
      return session;
    }
    saveMessages() {
      return Promise.resolve({ requestId: "mock", status: "completed" as const });
    }
    protected continueLastTurn(body?: Record<string, unknown>) {
      return mockBaseContinueLastTurn(body);
    }
  }
}));

import { MainAssistantAgent } from "../src/agents/MainAssistantAgent.js";
import {
  buildAssistantSystemPrompt,
  configureAssistantSession,
  getAssistantConfigValue
} from "../src/session/configureAssistantSession.js";
import { DEFAULT_MEMORY_MAX_TOKENS } from "../src/types/config.js";

type FakeSession = {
  withContext: ReturnType<typeof vi.fn>;
  withCachedPrompt: ReturnType<typeof vi.fn>;
  refreshSystemPrompt: ReturnType<typeof vi.fn>;
};

function createFakeSession(): FakeSession {
  const session: FakeSession = {
    withContext: vi.fn(),
    withCachedPrompt: vi.fn(),
    refreshSystemPrompt: vi.fn(async () => "prompt")
  };

  session.withContext.mockReturnValue(session);
  session.withCachedPrompt.mockReturnValue(session);

  return session;
}

describe("configureAssistantSession", () => {
  it("wires identity, instructions, memory, and cached prompt", async () => {
    const session = createFakeSession();
    configureAssistantSession(session as never, {
      identity: "custom identity",
      systemPrompt: "custom prompt",
      memoryMaxTokens: 2048
    });

    expect(session.withContext).toHaveBeenCalledTimes(3);
    expect(session.withContext).toHaveBeenNthCalledWith(
      1,
      "identity",
      expect.objectContaining({ provider: expect.any(Object) })
    );
    expect(session.withContext).toHaveBeenNthCalledWith(
      2,
      "instructions",
      expect.objectContaining({ provider: expect.any(Object) })
    );
    expect(session.withContext).toHaveBeenNthCalledWith(3, "memory", {
      description: "Durable conversation facts, user preferences, and follow-up context.",
      maxTokens: 2048
    });
    expect(session.withCachedPrompt).toHaveBeenCalledTimes(1);

    const identityProvider = session.withContext.mock.calls[0]?.[1]?.provider;
    const instructionsProvider = session.withContext.mock.calls[1]?.[1]?.provider;

    await expect(identityProvider.get()).resolves.toBe("custom identity");
    await expect(instructionsProvider.get()).resolves.toBe("custom prompt");
  });

  it("falls back to scaffold defaults when config is absent", async () => {
    const session = createFakeSession();
    configureAssistantSession(session as never, undefined);

    expect(session.withContext).toHaveBeenNthCalledWith(3, "memory", {
      description: "Durable conversation facts, user preferences, and follow-up context.",
      maxTokens: DEFAULT_MEMORY_MAX_TOKENS
    });

    const identityProvider = session.withContext.mock.calls[0]?.[1]?.provider;
    const instructionsProvider = session.withContext.mock.calls[1]?.[1]?.provider;

    await expect(identityProvider.get()).resolves.toContain("orchestrator");
    await expect(instructionsProvider.get()).resolves.toContain("primary Think assistant");
  });
});

describe("MainAssistantAgent integration helpers", () => {
  it("normalizes persisted config, exposes integration surfaces, and merges updates", async () => {
    const configure = vi.fn();
    const refreshSystemPrompt = vi.fn(async () => "prompt");
    let storedConfig = {
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      identity: "saved identity"
    };

    const fakeAgent = {
      getConfig: vi.fn(() => storedConfig),
      configure: vi.fn((next) => {
        storedConfig = next;
        configure(next);
      }),
      session: { refreshSystemPrompt },
      extensionRegistry: {
        getExposure: vi.fn(() => ({
          count: 1,
          extensions: [{
            id: "example-extension",
            name: "Example Extension",
            version: "0.1.0",
            description: "demo",
            status: "loaded",
            capabilities: ["registry", "diagnostics"]
          }]
        })),
        getDiagnostics: vi.fn(() => ({
          loadedCount: 1,
          extensionIds: ["example-extension"],
          limitations: ["static registry"]
        }))
      },
      mcpState: {
        getSurface: vi.fn(() => ({
          status: "disabled",
          config: {
            enabled: false,
            transport: "surface-only",
            configuredServers: []
          }
        })),
        getDiagnostics: vi.fn(() => ({
          serverCount: 0,
          enabledServerCount: 0,
          limitations: ["surface only"]
        }))
      },
      getAssistantConfig: vi.fn(() =>
        MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent)
      )
    };

    expect(
      MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent)
    ).toEqual(storedConfig);

    expect(
      MainAssistantAgent.prototype.getIntegrationSurfaces.call(fakeAgent)
    ).toEqual({
      extensions: {
        count: 1,
        extensions: [{
          id: "example-extension",
          name: "Example Extension",
          version: "0.1.0",
          description: "demo",
          status: "loaded",
          capabilities: ["registry", "diagnostics"]
        }]
      },
      mcp: {
        status: "disabled",
        config: {
          enabled: false,
          transport: "surface-only",
          configuredServers: []
        }
      }
    });

    expect(
      MainAssistantAgent.prototype.getIntegrationDiagnostics.call(fakeAgent)
    ).toEqual({
      extensions: {
        loadedCount: 1,
        extensionIds: ["example-extension"],
        limitations: ["static registry"]
      },
      mcp: {
        serverCount: 0,
        enabledServerCount: 0,
        limitations: ["surface only"]
      }
    });

    const updated = await MainAssistantAgent.prototype.updateAssistantConfig.call(fakeAgent, {
      systemPrompt: "Updated prompt",
      memoryMaxTokens: 1700
    });

    expect(updated).toEqual({
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      identity: "saved identity",
      systemPrompt: "Updated prompt",
      memoryMaxTokens: 1700
    });
    expect(configure).toHaveBeenCalledWith(updated);
    expect(refreshSystemPrompt).toHaveBeenCalledTimes(1);
  });

  it("rolls back config persistence when prompt refresh fails", async () => {
    const configure = vi.fn();
    let storedConfig = {
      model: "stable-model",
      systemPrompt: "old prompt"
    };
    const refreshFailure = new Error("refresh failed");

    const fakeAgent = {
      getConfig: vi.fn(() => storedConfig),
      configure: vi.fn((next) => {
        storedConfig = next;
        configure(next);
      }),
      session: {
        refreshSystemPrompt: vi.fn(async () => {
          throw refreshFailure;
        })
      },
      getAssistantConfig: vi.fn(() =>
        MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent)
      )
    };

    await expect(
      MainAssistantAgent.prototype.updateAssistantConfig.call(fakeAgent, {
        systemPrompt: "new prompt"
      })
    ).rejects.toThrow("refresh failed");

    expect(configure).toHaveBeenNthCalledWith(1, {
      model: "stable-model",
      systemPrompt: "new prompt"
    });
    expect(configure).toHaveBeenNthCalledWith(2, {
      model: "stable-model",
      systemPrompt: "old prompt"
    });
    expect(storedConfig).toEqual({
      model: "stable-model",
      systemPrompt: "old prompt"
    });
  });

  it("saves synthetic messages via saveMessages callback", async () => {
    const syntheticMessage: UIMessage = {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text: "Synthetic follow-up" }]
    };
    const saveMessages = vi.fn(async (updater: (messages: UIMessage[]) => UIMessage[]) => {
      const current: UIMessage[] = [
        {
          id: "msg-0",
          role: "assistant",
          parts: [{ type: "text", text: "Existing message" }]
        }
      ];

      expect(updater(current)).toEqual([...current, syntheticMessage]);
      return { requestId: "req-1", status: "completed" as const };
    });

    const result = await MainAssistantAgent.prototype.saveSyntheticMessage.call(
      { saveMessages },
      syntheticMessage
    );

    expect(saveMessages).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ requestId: "req-1", status: "completed" });
  });

  it("delegates continuation to Think continueLastTurn", async () => {
    mockBaseContinueLastTurn.mockClear();

    const result = await MainAssistantAgent.prototype.continueLastTurn.call(
      {},
      { source: "test" }
    );

    expect(mockBaseContinueLastTurn).toHaveBeenCalledWith({ source: "test" });
    expect(result).toEqual({ requestId: "req-continue", status: "completed" });
  });
});

describe("config helpers", () => {
  it("builds default prompt and returns normalized config values", () => {
    expect(buildAssistantSystemPrompt(undefined)).toContain("think-all-in-one project");
    expect(getAssistantConfigValue({ systemPrompt: "x", memoryMaxTokens: 123 })).toEqual({
      systemPrompt: "x",
      memoryMaxTokens: 123,
      model: undefined,
      identity: undefined
    });
  });
});
