import { beforeEach, describe, expect, it, vi } from "vitest";

const routeAgentRequest = vi.fn(async () => undefined as Response | undefined);

vi.mock("agents", () => ({
  routeAgentRequest
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

describe("worker smoke", () => {
  beforeEach(() => {
    routeAgentRequest.mockReset();
    routeAgentRequest.mockResolvedValue(undefined);
  });

  it("serves the critical health surface for the deployed worker", async () => {
    const mod = await import("../src/index.js");

    const response = await mod.default.fetch(
      new Request("https://think.godgodgame.com/health"),
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
      service: "think-all-in-one-worker",
      agents: [
        "MainAssistantAgent",
        "ResearchSubAgent",
        "MemorySubAgent",
        "OpsSubAgent"
      ]
    });
  });

  it("prefers mounted static assets for browser entry requests", async () => {
    const mod = await import("../src/index.js");
    const assetFetch = vi.fn(async () => new Response("<html>ok</html>", {
      status: 200,
      headers: { "content-type": "text/html" }
    }));

    const response = await mod.default.fetch(
      new Request("https://think.godgodgame.com/app"),
      {
        AI: {},
        ASSETS: { fetch: assetFetch },
        MainAssistantAgent: {},
        ResearchSubAgent: {},
        MemorySubAgent: {},
        OpsSubAgent: {}
      },
      { waitUntil() {} }
    );

    expect(assetFetch).toHaveBeenCalledTimes(1);
    expect(assetFetch).toHaveBeenCalledWith(expect.any(Request));
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toContain("ok");
  });
});
