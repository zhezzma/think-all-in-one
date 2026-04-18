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

    fireEvent.change(screen.getByLabelText("消息输入框"), {
      target: { value: "Ship it" }
    });

    await act(async () => {
      fireEvent.submit(screen.getByLabelText("消息输入框").closest("form")!);
    });

    expect(onSendMessage).toHaveBeenCalledWith("Ship it");
  });

  it("renders tool calls in a friendly card", () => {
    render(
      <ChatShell
        status="ready"
        messages={[
          {
            id: "m2",
            role: "assistant",
            parts: [
              {
                type: "text",
                text: '{"name":"grep","arguments":{"query":"你好呀"}}'
              },
              {
                type: "tool-grep",
                toolCallId: "tool-1",
                state: "output-available",
                input: { query: "你好呀" },
                output: { matches: [] }
              },
              {
                type: "text",
                text: "这是工具调用后的正常文本回复。"
              }
            ]
          }
        ]}
        onSendMessage={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getAllByText(/工具调用：grep/).length).toBeGreaterThan(0);
    expect(screen.getByText("这是工具调用后的正常文本回复。")).toBeInTheDocument();
    expect(screen.getAllByText("输入").length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByText("通过"));
    expect(onResolve).toHaveBeenCalledWith("a1", "approved");
  });
});

describe("ConfigPanel", () => {
  it("emits config changes and apply requests", async () => {
    const onChange = vi.fn();
    const onApply = vi.fn(async () => undefined);

    render(
      <ConfigPanel
        config={{ model: "@cf/meta/llama-3.1-8b-instruct", systemPrompt: "Be useful" }}
        onChange={onChange}
        onApply={onApply}
      />
    );

    fireEvent.change(screen.getByLabelText("模型"), {
      target: { value: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" }
    });
    expect(onChange).toHaveBeenCalledWith({ model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" });

    await act(async () => {
      fireEvent.click(screen.getByText("应用配置"));
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
