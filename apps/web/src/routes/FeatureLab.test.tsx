import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { FeatureLab } from "./FeatureLab";

describe("FeatureLab", () => {
  it("renders the tools lab and supports lab navigation", () => {
    const onNavigate = vi.fn();
    const onRunClientTool = vi.fn();
    const onRunAllClientTools = vi.fn();
    const onRenameSession = vi.fn(async () => undefined);
    const onClearSession = vi.fn(async () => undefined);
    const onCreateProfile = vi.fn(async () => undefined);
    const onUpdateProfile = vi.fn(async () => undefined);
    const onDeleteProfile = vi.fn(async () => undefined);
    const onAssignProfile = vi.fn(async () => undefined);
    const onUpdateEnabledTools = vi.fn(async () => undefined);
    const onUpdateEnabledExtensions = vi.fn(async () => undefined);

    render(
      <FeatureLab
        activeLab="tools"
        onNavigate={onNavigate}
        summary={{ messageCount: 2, connectionState: "connected", pendingApprovals: 1 }}
        messageCount={2}
        approvals={[]}
        config={{ model: "test-model", systemPrompt: "Be helpful" }}
        events={[]}
        clientTools={[
          {
            id: "browser-environment",
            name: "Browser environment",
            description: "Reads location and UA",
            category: "browser",
            lifecycle: "succeeded",
            registeredAt: "2026-04-17T00:00:00.000Z",
            lastRunAt: "2026-04-17T00:00:00.000Z",
            runCount: 1,
            lastResult: { href: "http://localhost" }
          }
        ]}
        onRunClientTool={onRunClientTool}
        onRunAllClientTools={onRunAllClientTools}
        agentHost="http://localhost:8787"
        sessionId="main"
        session={{
          id: "main",
          title: "主聊天",
          createdAt: "2026-04-17T00:00:00.000Z",
          updatedAt: "2026-04-17T00:00:00.000Z"
        }}
        sessions={[
          {
            id: "main",
            title: "主聊天",
            createdAt: "2026-04-17T00:00:00.000Z",
            updatedAt: "2026-04-17T00:00:00.000Z"
          }
        ]}
        profiles={[]}
        toolCatalog={{
          count: 2,
          enabledCount: 1,
          tools: [
            { id: "diagnostics", enabled: true, description: "Diagnostics tool" },
            { id: "notes", enabled: false, description: "Notes tool" }
          ]
        }}
        extensionCatalog={{
          count: 1,
          extensions: [
            {
              id: "example-extension",
              name: "Example Extension",
              version: "0.1.0",
              description: "Demo extension",
              status: "loaded",
              capabilities: ["registry"],
              enabled: false
            }
          ]
        }}
        onRenameSession={onRenameSession}
        onClearSession={onClearSession}
        onCreateProfile={onCreateProfile}
        onUpdateProfile={onUpdateProfile}
        onDeleteProfile={onDeleteProfile}
        onAssignProfile={onAssignProfile}
        onUpdateEnabledTools={onUpdateEnabledTools}
        onUpdateEnabledExtensions={onUpdateEnabledExtensions}
      />
    );

    expect(screen.getByText("Tools lab")).toBeInTheDocument();
    expect(screen.getByText("Diagnostics tool")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Toggle tool notes" }));
    expect(onUpdateEnabledTools).toHaveBeenCalledWith(["diagnostics", "notes"]);

    fireEvent.click(screen.getByRole("button", { name: "会话" }));
    expect(onNavigate).toHaveBeenCalledWith("session");
  });
});
