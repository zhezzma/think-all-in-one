import { routeAgentRequest } from "agents";

import { MainAssistantAgent } from "./agents/MainAssistantAgent.js";
import { MemorySubAgent } from "./agents/subagents/MemorySubAgent.js";
import { OpsSubAgent } from "./agents/subagents/OpsSubAgent.js";
import { ResearchSubAgent } from "./agents/subagents/ResearchSubAgent.js";

export type Env = {
  AI: unknown;
  ASSETS?: {
    fetch(input: Request | string | URL, init?: RequestInit): Promise<Response>;
  };
  ARTIFACTS?: unknown;
  MainAssistantAgent: unknown;
  ResearchSubAgent: unknown;
  MemorySubAgent: unknown;
  OpsSubAgent: unknown;
};

export {
  MainAssistantAgent,
  ResearchSubAgent,
  MemorySubAgent,
  OpsSubAgent
};

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const worker = {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({
        ok: true,
        service: "think-all-in-one-worker",
        agents: [
          "MainAssistantAgent",
          "ResearchSubAgent",
          "MemorySubAgent",
          "OpsSubAgent"
        ]
      });
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    ctx.waitUntil(Promise.resolve());
    return new Response("Not found", { status: 404 });
  }
};

export default worker;
