import { beforeEach, describe, expect, it, vi } from "vitest";

const routeAgentRequest = vi.fn(async () => undefined as Response | undefined);

vi.mock("agents", () => ({
  routeAgentRequest,
  callable: () => (target: unknown) => target
}));

vi.mock("@cloudflare/think", () => ({
  Think: class Think<Env = unknown> {
    env!: Env;
    getSystemPrompt() {
      return "";
    }
    configureSession(session: unknown) {
      return session;
    }
  }
}));

vi.mock("workers-ai-provider", () => ({
  createWorkersAI: () => () => ({ provider: "workers-ai" })
}));

vi.mock("./workspace/createWorkspace.js", () => ({
  createWorkspace: () => ({
    getWorkspaceInfo: async () => ({ fileCount: 0, directoryCount: 0, totalBytes: 0, r2FileCount: 0 })
  })
}));

describe("worker module", () => {
  beforeEach(() => {
    routeAgentRequest.mockReset();
    routeAgentRequest.mockResolvedValue(undefined);
  });

  it("loads worker entry and exports fetch", async () => {
    const mod = await import("./index.js");

    expect(mod.default).toBeDefined();
    expect(typeof mod.default.fetch).toBe("function");
    expect(mod.MainAssistantAgent).toBeDefined();
    expect(mod.ResearchSubAgent).toBeDefined();
    expect(mod.MemorySubAgent).toBeDefined();
    expect(mod.OpsSubAgent).toBeDefined();
  });

  it("returns health JSON for /health", async () => {
    const mod = await import("./index.js");
    const response = await mod.default.fetch(
      new Request("https://example.com/health"),
      {
        AI: {},
        MainAssistantAgent: {},
        ResearchSubAgent: {},
        MemorySubAgent: {},
        OpsSubAgent: {}
      },
      { waitUntil() {} }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      service: "think-all-in-one-worker"
    });
  });

  it("short-circuits when routeAgentRequest returns a response", async () => {
    const mod = await import("./index.js");
    routeAgentRequest.mockResolvedValueOnce(new Response("agent", { status: 202 }));

    const response = await mod.default.fetch(
      new Request("https://example.com/agents/main"),
      {
        AI: {},
        MainAssistantAgent: {},
        ResearchSubAgent: {},
        MemorySubAgent: {},
        OpsSubAgent: {}
      },
      { waitUntil() {} }
    );

    expect(response.status).toBe(202);
    await expect(response.text()).resolves.toBe("agent");
  });

  it("falls back to 404 when no route matches and assets are absent", async () => {
    const mod = await import("./index.js");

    const response = await mod.default.fetch(
      new Request("https://example.com/missing"),
      {
        AI: {},
        MainAssistantAgent: {},
        ResearchSubAgent: {},
        MemorySubAgent: {},
        OpsSubAgent: {}
      },
      { waitUntil() {} }
    );

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Not found");
  });
});
