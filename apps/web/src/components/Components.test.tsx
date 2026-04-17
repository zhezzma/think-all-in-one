import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { ApprovalsPanel } from "./ApprovalsPanel";
import { ChatShell } from "./ChatShell";
import { ConfigPanel } from "./ConfigPanel";
import { EventLog } from "./EventLog";

describe("ChatShell", () => {
  it("renders messages and submits draft input", async () => {
    const onSendMessage = vi.fn(async () => undefined);

    render(
      <ChatShell
        status="ready"
        messages={[
          {
            id: "m1",
            role: "assistant",
            parts: [{ type: "text", text: "Hello from component test." }]
          }
        ]}
        onSendMessage={onSendMessage}
      />
    );

    expect(screen.getByText("Hello from component test.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Message input"), {
      target: { value: "Ship it" }
    });

    await act(async () => {
      fireEvent.submit(screen.getByLabelText("Message input").closest("form")!);
    });

    expect(onSendMessage).toHaveBeenCalledWith("Ship it");
  });
});

describe("ApprovalsPanel", () => {
  it("renders approvals and resolves them", () => {
    const onResolve = vi.fn();

    render(
      <ApprovalsPanel
        approvals={[
          {
            id: "a1",
            title: "Protected delete",
            description: "Needs approval",
            status: "pending"
          }
        ]}
        onResolve={onResolve}
      />
    );

    fireEvent.click(screen.getByText("Approve"));
    expect(onResolve).toHaveBeenCalledWith("a1", "approved");
  });
});

describe("ConfigPanel", () => {
  it("emits config changes and apply requests", async () => {
    const onChange = vi.fn();
    const onApply = vi.fn(async () => undefined);

    render(
      <ConfigPanel
        config={{ model: "test-model", systemPrompt: "Be useful" }}
        onChange={onChange}
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByDisplayValue("test-model"), {
      target: { value: "better-model" }
    });
    expect(onChange).toHaveBeenCalledWith({ model: "better-model" });

    await act(async () => {
      fireEvent.click(screen.getByText("Apply draft"));
    });
    expect(onApply).toHaveBeenCalled();
  });
});

describe("EventLog", () => {
  it("renders timestamped agent events", () => {
    render(
      <EventLog
        events={[
          {
            id: "e1",
            type: "system",
            detail: "UI booted",
            timestamp: "2026-04-17T00:00:00.000Z"
          }
        ]}
      />
    );

    expect(screen.getByText("UI booted")).toBeInTheDocument();
    expect(screen.getByText("2026-04-17T00:00:00.000Z")).toBeInTheDocument();
  });
});
