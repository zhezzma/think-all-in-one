import { routeAgentRequest } from "agents";

import { MainAssistantAgent } from "./agents/MainAssistantAgent.js";
import { MemorySubAgent } from "./agents/subagents/MemorySubAgent.js";
import { OpsSubAgent } from "./agents/subagents/OpsSubAgent.js";
import { ResearchSubAgent } from "./agents/subagents/ResearchSubAgent.js";

const REQUIRED_AUTH_TOKEN = "1234567809";

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
    const url = new URL(request.url);

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return handleLogin(request);
    }

    if (url.pathname.startsWith("/agents/") && !isAuthorized(request)) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

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

async function handleLogin(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const bodyToken = body.token?.trim();
    const headerToken = extractTokenFromRequest(request);
    const token = bodyToken || headerToken;

    if (token !== REQUIRED_AUTH_TOKEN) {
      return Response.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
}

function isAuthorized(request: Request) {
  return extractTokenFromRequest(request) === REQUIRED_AUTH_TOKEN;
}

function extractTokenFromRequest(request: Request) {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim();
  if (queryToken) {
    return queryToken;
  }

  const authHeader = request.headers.get("Authorization") ?? request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

export default worker;
