import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ApprovalsPanel } from "../ApprovalsPanel";
import { ChatShell } from "../ChatShell";
import { ConfigPanel } from "../ConfigPanel";
import { EventLog } from "../EventLog";

describe("frontend smoke", () => {
  it("renders the core operator surfaces together", () => {
    render(
      <div>
        <ChatShell
          status="ready"
          messages={[
            {
              id: "m1",
              role: "assistant",
              parts: [{ type: "text", text: "System online." }]
            }
          ]}
          onSendMessage={vi.fn(async () => undefined)}
        />
        <ApprovalsPanel
          approvals={[
            {
              id: "a1",
              title: "Protected delete",
              description: "Requires confirmation.",
              status: "pending"
            }
          ]}
          onResolve={vi.fn()}
        />
        <ConfigPanel
          config={{ model: "@cf/meta/llama-3.1-8b-instruct", systemPrompt: "Be helpful" }}
          onChange={vi.fn()}
          onApply={vi.fn(async () => undefined)}
        />
        <EventLog
          events={[
            {
              id: "e1",
              type: "system",
              detail: "Assistant UI connected to MainAssistantAgent.",
              timestamp: "2026-04-17T00:00:00.000Z"
            }
          ]}
        />
      </div>
    );

    expect(screen.getByText("Assistant chat")).toBeInTheDocument();
    expect(screen.getByText("Approval inbox")).toBeInTheDocument();
    expect(screen.getByText("Assistant config")).toBeInTheDocument();
    expect(screen.getByText("Event log")).toBeInTheDocument();
    expect(screen.getByText("System online.")).toBeInTheDocument();
  });

  it("allows a lightweight message send flow from the chat shell", async () => {
    const onSendMessage = vi.fn(async () => undefined);

    render(<ChatShell status="ready" messages={[]} onSendMessage={onSendMessage} />);

    fireEvent.change(screen.getByLabelText("Message input"), {
      target: { value: "Run smoke verification" }
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Send"));
    });

    expect(onSendMessage).toHaveBeenCalledWith("Run smoke verification");
  });
});
