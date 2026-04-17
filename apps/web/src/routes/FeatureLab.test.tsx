import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { FeatureLab } from "./FeatureLab";

describe("FeatureLab", () => {
  it("renders the client tools lab and supports lab navigation", () => {
    const onNavigate = vi.fn();
    const onRunClientTool = vi.fn();
    const onRunAllClientTools = vi.fn();

    render(
      <FeatureLab
        activeLab="client-tools"
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
      />
    );

    expect(screen.getByText("Client tools lab")).toBeInTheDocument();
    expect(screen.getByText("Browser environment")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Re-run all tools"));
    expect(onRunAllClientTools).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Session" }));
    expect(onNavigate).toHaveBeenCalledWith("session");
  });
});
