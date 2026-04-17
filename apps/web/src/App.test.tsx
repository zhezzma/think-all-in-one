import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

const mockedState = {
  chat: {
    messages: [
      {
        id: "m1",
        role: "assistant",
        parts: [{ type: "text", text: "Hello from the main agent." }]
      }
    ],
    status: "ready"
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
  resolveApproval: vi.fn(),
  clearHistory: vi.fn(),
  sessionId: "main"
};

vi.mock("./lib/agent", () => ({
  useAssistantUiState: () => mockedState,
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
  });

  it("renders assistant surfaces", () => {
    render(<App />);

    expect(screen.getByText("Main assistant workspace")).toBeInTheDocument();
    expect(screen.getByText("Chats")).toBeInTheDocument();
    expect(screen.getByText("New chat")).toBeInTheDocument();
    expect(screen.getByText("Approval inbox")).toBeInTheDocument();
    expect(screen.getByText("Assistant config")).toBeInTheDocument();
    expect(screen.getByText("Event log")).toBeInTheDocument();
    expect(screen.getByText("Hello from the main agent.")).toBeInTheDocument();
  });

  it("submits a chat message via the shell", async () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Message input"), {
      target: { value: "Plan the next step" }
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Send"));
    });

    expect(mockedState.submitMessage).toHaveBeenCalledWith("Plan the next step");
  });

  it("creates a new chat session from the sidebar", async () => {
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByText("New chat"));
    });

    expect(screen.getAllByText(/chat-/i).length).toBeGreaterThan(0);
  });

  it("renders the feature lab when hash navigation targets it", () => {
    window.location.hash = "#lab/session";

    render(<App />);

    expect(screen.getByText("Integration surfaces and local tools")).toBeInTheDocument();
    expect(screen.getByText("Session lab")).toBeInTheDocument();
  });
});
