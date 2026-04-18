import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const mockedAssistantState = {
  chat: {
    messages: [
      {
        id: "m1",
        role: "assistant",
        parts: [{ type: "text", text: "Hello from the main agent." }]
      }
    ],
    status: "ready",
    clearHistory: vi.fn(),
    sendMessage: vi.fn(async () => undefined)
  },
  approvals: [
    {
      id: "a1",
      title: "Protected delete",
      description: "Needs human approval.",
      status: "pending"
    }
  ],
  config: {
    model: "test-model",
    systemPrompt: "Be helpful"
  },
  toolCatalog: {
    count: 2,
    enabledCount: 1,
    tools: [
      { id: "diagnostics", enabled: true, description: "Diagnostics" },
      { id: "notes", enabled: false, description: "Notes" }
    ]
  },
  extensionCatalog: {
    count: 1,
    extensions: [
      {
        id: "example-extension",
        name: "Example Extension",
        version: "0.1.0",
        description: "Demo extension",
        status: "loaded",
        capabilities: ["registry"],
        enabled: true
      }
    ]
  },
  events: [
    {
      id: "e1",
      timestamp: "2026-04-17T00:00:00.000Z",
      type: "system",
      detail: "UI ready"
    }
  ],
  summary: {
    messageCount: 1,
    connectionState: "connected",
    pendingApprovals: 1
  },
  submitMessage: vi.fn(async () => undefined),
  updateConfig: vi.fn(),
  applyConfig: vi.fn(async () => undefined),
  updateEnabledTools: vi.fn(async () => undefined),
  updateEnabledExtensions: vi.fn(async () => undefined),
  syncAssistantConfig: vi.fn(async () => undefined),
  refreshSessionState: vi.fn(async () => undefined),
  resolveApproval: vi.fn(),
  clearHistory: vi.fn(async () => undefined),
  sessionId: "main"
};

const mockedControlPlane = {
  snapshot: {
    path: "/system/control-plane.json",
    currentSessionId: "main",
    document: {
      version: 1,
      sessions: [
        {
          id: "main",
          title: "Main chat",
          createdAt: "2026-04-17T00:00:00.000Z",
          updatedAt: "2026-04-17T00:00:00.000Z"
        }
      ],
      profiles: [
        {
          id: "profile-a",
          name: "Profile A",
          description: "Default profile",
          config: { model: "test-model" },
          createdAt: "2026-04-17T00:00:00.000Z",
          updatedAt: "2026-04-17T00:00:00.000Z"
        }
      ]
    },
    toolCatalog: mockedAssistantState.toolCatalog,
    extensionCatalog: mockedAssistantState.extensionCatalog,
    assistantConfig: mockedAssistantState.config
  },
  loading: false,
  error: null,
  refresh: vi.fn(async () => undefined),
  createSession: vi.fn(async () => undefined),
  updateSession: vi.fn(async () => undefined),
  deleteSession: vi.fn(async () => undefined),
  createProfile: vi.fn(async () => undefined),
  updateProfile: vi.fn(async () => undefined),
  deleteProfile: vi.fn(async () => undefined)
};

vi.mock("./lib/agent", () => ({
  useAssistantUiState: () => mockedAssistantState,
  useControlPlaneState: () => mockedControlPlane,
  resolveAgentHost: () => "http://localhost:8787"
}));

vi.mock("./lib/clientTools", () => ({
  useClientToolRegistry: () => ({
    entries: [
      {
        id: "browser-environment",
        name: "Browser environment",
        description: "Reads browser state",
        category: "browser",
        lifecycle: "succeeded",
        registeredAt: "2026-04-17T00:00:00.000Z",
        lastRunAt: "2026-04-17T00:00:00.000Z",
        runCount: 1,
        lastResult: { href: "http://localhost/" }
      }
    ],
    rerunTool: vi.fn(async () => undefined),
    rerunAll: vi.fn(async () => undefined)
  })
}));

import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.location.hash = "#console";
    vi.clearAllMocks();
  });

  it("renders assistant surfaces", () => {
    render(<App />);

    expect(screen.getByText("主助手工作台")).toBeInTheDocument();
    expect(screen.getByText("聊天列表")).toBeInTheDocument();
    expect(screen.getByText("新建聊天")).toBeInTheDocument();
    expect(screen.getByText("审批列表")).toBeInTheDocument();
    expect(screen.getByText("助手配置")).toBeInTheDocument();
    expect(screen.getByText("事件日志")).toBeInTheDocument();
    expect(screen.getByText("Hello from the main agent.")).toBeInTheDocument();
    expect(screen.getAllByText("Main chat").length + screen.queryAllByText("主聊天").length).toBeGreaterThan(0);
  });

  it("submits a chat message via the shell", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("消息输入框"), {
      target: { value: "Plan the next step" }
    });

    await act(async () => {
      fireEvent.click(screen.getByText("发送"));
    });

    expect(mockedAssistantState.submitMessage).toHaveBeenCalledWith("Plan the next step");
  });

  it("creates a new durable chat session from the sidebar", async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByText("新建聊天"));
    });

    expect(mockedControlPlane.createSession).toHaveBeenCalledTimes(1);
    const firstCreateSessionCall = mockedControlPlane.createSession.mock.calls[0] as unknown as
      | [Record<string, unknown>]
      | undefined;
    expect(firstCreateSessionCall?.[0]).toMatchObject({
      title: "新聊天"
    });
  });

  it("renders the feature lab when hash navigation targets it", () => {
    window.location.hash = "#lab/session";

    render(<App />);

    expect(screen.getByText("集成能力与本地工具")).toBeInTheDocument();
    expect(screen.getByText("会话实验室")).toBeInTheDocument();
    expect(screen.getByText("档案管理")).toBeInTheDocument();
  });
});
