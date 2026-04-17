import { describe, expect, it, vi, beforeEach } from "vitest";
import type { UIMessage } from "ai";

const mockBaseContinueLastTurn = vi.fn(async (body?: Record<string, unknown>) => ({
  requestId: body ? "req-continue" : "req-skip",
  status: body ? "completed" as const : "skipped" as const
}));

const workspaceFiles = new Map<string, string>();

vi.mock("agents", () => ({
  callable: () => (target: unknown) => target
}));

vi.mock("../src/workspace/createWorkspace.js", () => ({
  createWorkspace: () => ({
    getWorkspaceInfo: async () => ({ fileCount: 0, directoryCount: 0, totalBytes: 0, r2FileCount: 0 }),
    readFile: async (path: string) => workspaceFiles.get(path) ?? null,
    writeFile: async (path: string, content: string) => {
      workspaceFiles.set(path, content);
    },
    rm: async (path: string) => {
      workspaceFiles.delete(path);
    }
  })
}));

vi.mock("@cloudflare/think", () => ({
  Think: class Think<Env = unknown, Config = Record<string, unknown>> {
    env!: Env;
    name = "session-main";
    session = { refreshSystemPrompt: vi.fn(async () => "prompt") };
    workspace!: unknown;
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
import { CONTROL_PLANE_DOCUMENT_PATH } from "../src/controlPlane/document.js";
import { DEFAULT_MEMORY_MAX_TOKENS, normalizeAssistantConfig } from "../src/types/config.js";

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

beforeEach(() => {
  workspaceFiles.clear();
});

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
  it("normalizes persisted config, exposes enablement-aware surfaces, and merges updates", async () => {
    const configure = vi.fn();
    const refreshSystemPrompt = vi.fn(async () => "prompt");
    let storedConfig = {
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      identity: "saved identity",
      enabledExtensions: ["example-extension"]
    };

    const fakeAgent = {
      getConfig: vi.fn(() => storedConfig),
      configure: vi.fn((next) => {
        storedConfig = next;
        configure(next);
      }),
      session: { refreshSystemPrompt },
      extensionRegistry: {
        getExposure: vi.fn((enabled: string[] | undefined) => ({
          count: enabled?.length ?? 0,
          extensions: enabled?.length
            ? [{
                id: "example-extension",
                name: "Example Extension",
                version: "0.1.0",
                description: "demo",
                status: "loaded",
                capabilities: ["registry", "diagnostics"],
                enabled: true
              }]
            : []
        })),
        getDiagnostics: vi.fn((enabled: string[] | undefined) => ({
          availableCount: 1,
          enabledCount: enabled?.length ?? 0,
          loadedCount: enabled?.length ?? 0,
          extensionIds: ["example-extension"],
          enabledExtensionIds: enabled ?? [],
          disabledExtensionIds: enabled?.length ? [] : ["example-extension"],
          limitations: enabled?.length ? ["dynamic enablement"] : []
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
      getAssistantConfig: vi.fn(() => MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent)),
      getEnabledExtensionIds: vi.fn(() => storedConfig.enabledExtensions)
    };

    expect(MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent)).toEqual(storedConfig);

    expect(MainAssistantAgent.prototype.getIntegrationSurfaces.call(fakeAgent)).toEqual({
      extensions: {
        count: 1,
        extensions: [{
          id: "example-extension",
          name: "Example Extension",
          version: "0.1.0",
          description: "demo",
          status: "loaded",
          capabilities: ["registry", "diagnostics"],
          enabled: true
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

    expect(MainAssistantAgent.prototype.getIntegrationDiagnostics.call(fakeAgent)).toEqual({
      extensions: {
        availableCount: 1,
        enabledCount: 1,
        loadedCount: 1,
        extensionIds: ["example-extension"],
        enabledExtensionIds: ["example-extension"],
        disabledExtensionIds: [],
        limitations: ["dynamic enablement"]
      },
      mcp: {
        serverCount: 0,
        enabledServerCount: 0,
        limitations: ["surface only"]
      }
    });

    const updated = await MainAssistantAgent.prototype.updateAssistantConfig.call(fakeAgent, {
      systemPrompt: "Updated prompt",
      memoryMaxTokens: 1700,
      enabledTools: ["notes", "diagnostics", "notes"]
    });

    expect(updated).toEqual({
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      identity: "saved identity",
      enabledExtensions: ["example-extension"],
      systemPrompt: "Updated prompt",
      memoryMaxTokens: 1700,
      enabledTools: ["diagnostics", "notes"]
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
      getAssistantConfig: vi.fn(() => MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent))
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

  it("filters tools based on enabledTools config and reports a catalog", () => {
    const fakeAgent = {
      getEnabledToolIds: vi.fn(() => ["notes"]),
      getAllTools: vi.fn(() => ({ diagnostics: { a: 1 }, notes: { b: 2 }, protected_delete: { c: 3 } })),
      getToolCatalogEntries: vi.fn(() => [
        { id: "diagnostics", enabled: false, description: "diag" },
        { id: "notes", enabled: true, description: "notes" },
        { id: "protected_delete", enabled: false, description: "delete" }
      ])
    };

    expect(MainAssistantAgent.prototype.getTools.call(fakeAgent)).toEqual({ notes: { b: 2 } });
    expect(MainAssistantAgent.prototype.getToolCatalog.call(fakeAgent)).toEqual({
      count: 3,
      enabledCount: 1,
      tools: [
        { id: "diagnostics", enabled: false, description: "diag" },
        { id: "notes", enabled: true, description: "notes" },
        { id: "protected_delete", enabled: false, description: "delete" }
      ]
    });
  });

  it("treats enabledTools undefined as default-all and [] as disable-all", () => {
    const allTools = { diagnostics: { a: 1 }, notes: { b: 2 } };

    expect(MainAssistantAgent.prototype.getTools.call({
      getEnabledToolIds: () => undefined,
      getAllTools: () => allTools
    })).toEqual(allTools);

    expect(MainAssistantAgent.prototype.getTools.call({
      getEnabledToolIds: () => [],
      getAllTools: () => allTools
    })).toEqual({});
  });

  it("reads and mutates the control-plane document in workspace", async () => {
    const agent = new MainAssistantAgent(
      { storage: { sql: {} } } as never,
      {} as never
    );

    expect(await agent.getControlPlaneSnapshot()).toMatchObject({
      path: CONTROL_PLANE_DOCUMENT_PATH,
      currentSessionId: "session-main",
      document: { version: 1, sessions: [], profiles: [] }
    });

    const createdProfile = await agent.createAgentProfile({
      id: "profile-a",
      name: "Profile A",
      config: { enabledTools: ["notes"], enabledExtensions: ["example-extension"] }
    });
    expect(createdProfile).toMatchObject({
      id: "profile-a",
      name: "Profile A",
      config: { enabledTools: ["notes"], enabledExtensions: ["example-extension"] }
    });

    const updatedProfile = await agent.updateAgentProfile({
      id: "profile-a",
      name: "Profile A+",
      description: "updated",
      config: { profileId: "ignored-self-field", enabledTools: ["diagnostics"] }
    });
    expect(updatedProfile).toMatchObject({
      id: "profile-a",
      name: "Profile A+",
      description: "updated",
      config: { enabledTools: ["diagnostics"], enabledExtensions: ["example-extension"], profileId: "ignored-self-field" }
    });

    const createdSession = await agent.createSessionRecord({
      id: "session-main",
      title: "Primary session",
      profileId: "profile-a"
    });
    expect(createdSession).toMatchObject({ id: "session-main", title: "Primary session", profileId: "profile-a" });

    const updatedSession = await agent.updateSessionRecord({
      id: "session-main",
      title: "Renamed session"
    });
    expect(updatedSession).toMatchObject({ id: "session-main", title: "Renamed session" });

    const snapshot = await agent.getControlPlaneSnapshot();
    expect(snapshot.document.sessions).toHaveLength(1);
    expect(snapshot.document.profiles).toHaveLength(1);
    expect(workspaceFiles.get(CONTROL_PLANE_DOCUMENT_PATH)).toContain('"session-main"');
    expect(workspaceFiles.get(CONTROL_PLANE_DOCUMENT_PATH)).toContain('"profile-a"');

    expect(await agent.deleteAgentProfile("profile-a")).toEqual({ deleted: true, id: "profile-a" });
    expect(await agent.deleteSessionRecord("session-main")).toEqual({ deleted: true, id: "session-main" });
    expect(await agent.listAgentProfiles()).toEqual([]);
  });

  it("updates enabled tools/extensions and clears session history through persisted messages", async () => {
    let storedConfig = {};
    const saveMessages = vi.fn(async (updater: (messages: UIMessage[]) => UIMessage[]) => {
      expect(updater([
        { id: "msg-1", role: "user", parts: [{ type: "text", text: "hello" }] }
      ])).toEqual([]);
      return { requestId: "req-clear", status: "completed" as const };
    });
    const fakeAgent = {
      getConfig: vi.fn(() => storedConfig),
      configure: vi.fn((next) => {
        storedConfig = next;
      }),
      session: { refreshSystemPrompt: vi.fn(async () => "prompt") },
      saveMessages,
      getAssistantConfig: vi.fn(() => MainAssistantAgent.prototype.getAssistantConfig.call(fakeAgent)),
      updateAssistantConfig: vi.fn((update: Record<string, unknown>) =>
        MainAssistantAgent.prototype.updateAssistantConfig.call(fakeAgent, update)
      )
    };

    await expect(MainAssistantAgent.prototype.updateEnabledTools.call(fakeAgent, ["notes", "notes"]))
      .resolves.toMatchObject({ enabledTools: ["notes"] });
    await expect(MainAssistantAgent.prototype.updateEnabledExtensions.call(fakeAgent, ["example-extension"]))
      .resolves.toMatchObject({ enabledExtensions: ["example-extension"], enabledTools: ["notes"] });
    await expect(MainAssistantAgent.prototype.clearSessionHistory.call(fakeAgent))
      .resolves.toEqual({ requestId: "req-clear", status: "completed" });
    expect(saveMessages).toHaveBeenCalledTimes(1);
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
      identity: undefined,
      profileId: undefined,
      enabledTools: undefined,
      enabledExtensions: undefined
    });
    expect(normalizeAssistantConfig({ enabledTools: ["notes", "notes", ""], enabledExtensions: ["z", "a"] }))
      .toEqual({
        model: undefined,
        systemPrompt: undefined,
        identity: undefined,
        memoryMaxTokens: undefined,
        profileId: undefined,
        enabledTools: ["notes"],
        enabledExtensions: ["a", "z"]
      });
    expect(normalizeAssistantConfig({ enabledTools: [], enabledExtensions: [] }))
      .toEqual({
        model: undefined,
        systemPrompt: undefined,
        identity: undefined,
        memoryMaxTokens: undefined,
        profileId: undefined,
        enabledTools: [],
        enabledExtensions: []
      });
  });
});
