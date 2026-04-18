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

  it("renders collapsible reasoning and tool blocks from transcript text", () => {
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
                text: `步骤\n{\n  "type": "reasoning",\n  "text": "先想一下笑话应该怎么讲。",\n  "state": "done"\n}\n\n工具调用：notes\n已完成\n输入\n{\n  "action": "set",\n  "key": "joke"\n}\n输出\n{\n  "saved": true\n}\n\n这是工具调用后的正常文本回复。`
              }
            ]
          }
        ]}
        onSendMessage={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByText("思考过程")).toBeInTheDocument();
    expect(screen.getByText("工具调用：notes")).toBeInTheDocument();
    expect(screen.getByText("这是工具调用后的正常文本回复。")).toBeInTheDocument();
    expect(screen.getAllByText("点击展开").length).toBeGreaterThan(0);
  });

  it("renders tool calls in a friendly card", () => {
    render(
      <ChatShell
        status="ready"
        messages={[
          {
            id: "m3",
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
    expect(screen.getAllByText("点击展开").length).toBeGreaterThan(0);
  });

  it("renders native reasoning parts as collapsible cards", () => {
    render(
      <ChatShell
        status="ready"
        messages={[
          {
            id: "m4",
            role: "assistant",
            parts: [
              {
                type: "reasoning",
                text: "好的，用户让我看看目录下有什么，我先整理一下结果。"
              },
              {
                type: "text",
                text: "当前目录下只有 notes 目录。"
              }
            ]
          }
        ] as any}
        onSendMessage={vi.fn(async () => undefined)}
      />
    );

    expect(screen.getByText("思考过程")).toBeInTheDocument();
    expect(screen.getByText("好的，用户让我看看目录下有什么，我先整理一下结果。")).toBeInTheDocument();
    expect(screen.getByText("当前目录下只有 notes 目录。")).toBeInTheDocument();
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
  it("renders timestamped agent events as collapsible entries", () => {
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

    expect(screen.getByText("system")).toBeInTheDocument();
    expect(screen.getByText("UI booted")).toBeInTheDocument();
    expect(screen.getByText("2026-04-17T00:00:00.000Z")).toBeInTheDocument();
    expect(screen.getByText("点击展开")).toBeInTheDocument();
  });
});
