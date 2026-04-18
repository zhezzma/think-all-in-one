import { useState } from "react";
import type { UIMessage } from "ai";

type ChatShellProps = {
  messages: UIMessage[];
  status?: string;
  onSendMessage(message: string): Promise<void> | void;
};

type ToolLikePayload = {
  name: string;
  arguments?: unknown;
};

export function ChatShell({ messages, status = "ready", onSendMessage }: ChatShellProps) {
  const [draft, setDraft] = useState("");

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={titleStyle}>助手对话</h2>
          <p style={metaStyle}>通过 useAgentChat() 实时流式通信</p>
        </div>
        <span aria-label="chat-status">{translateStatus(status)}</span>
      </header>

      <div style={messageListStyle} aria-label="chat-messages">
        {messages.length === 0 ? (
          <p style={emptyStyle}>先发一句话，开始和当前助手会话聊天。</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} style={messageStyle}>
              <strong style={roleStyle}>{translateRole(message.role)}</strong>
              <div style={partStackStyle}>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    const inferredToolCall = tryParseToolCallText(part.text);
                    if (inferredToolCall) {
                      return (
                        <ToolCallCard
                          key={index}
                          title={`工具调用：${inferredToolCall.name}`}
                          stateLabel="模型输出的工具调用"
                          input={inferredToolCall.arguments}
                        />
                      );
                    }

                    return <p key={index} style={textPartStyle}>{part.text}</p>;
                  }

                  if (part.type === "step-start") {
                    return <div key={index} style={stepDividerStyle}>步骤</div>;
                  }

                  if (isToolPart(part)) {
                    return (
                      <ToolCallCard
                        key={index}
                        title={`工具调用：${part.type.replace(/^tool-/, "")}`}
                        stateLabel={translateToolState(part.state)}
                        input={part.input}
                        output={"output" in part ? part.output : undefined}
                        errorText={"errorText" in part ? part.errorText : undefined}
                      />
                    );
                  }

                  return (
                    <pre key={index} style={rawPartStyle}>
                      {JSON.stringify(part, null, 2)}
                    </pre>
                  );
                })}
              </div>
            </article>
          ))
        )}
      </div>

      <form
        style={composerStyle}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!draft.trim()) return;
          await onSendMessage(draft);
          setDraft("");
        }}
      >
        <input
          aria-label="消息输入框"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="输入你的问题，比如：帮我规划一下下一步，或者先打个招呼。"
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle} disabled={status === "streaming"}>
          发送
        </button>
      </form>
    </section>
  );
}

function ToolCallCard({
  title,
  stateLabel,
  input,
  output,
  errorText
}: {
  title: string;
  stateLabel: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}) {
  return (
    <section style={toolCardStyle}>
      <div style={toolHeaderStyle}>
        <strong>{title}</strong>
        <span style={toolStateStyle}>{stateLabel}</span>
      </div>
      {input !== undefined ? (
        <div>
          <div style={toolLabelStyle}>输入</div>
          <pre style={toolPreStyle}>{JSON.stringify(input, null, 2)}</pre>
        </div>
      ) : null}
      {output !== undefined ? (
        <div>
          <div style={toolLabelStyle}>输出</div>
          <pre style={toolPreStyle}>{typeof output === "string" ? output : JSON.stringify(output, null, 2)}</pre>
        </div>
      ) : null}
      {errorText ? (
        <div>
          <div style={toolErrorLabelStyle}>错误</div>
          <pre style={toolErrorPreStyle}>{errorText}</pre>
        </div>
      ) : null}
    </section>
  );
}

function isToolPart(part: UIMessage["parts"][number]): part is Extract<UIMessage["parts"][number], { type: `tool-${string}`; input: unknown; state: unknown }> {
  return part.type.startsWith("tool-") && "input" in part && "state" in part;
}

function translateRole(role: string) {
  if (role === "user") return "你";
  if (role === "assistant") return "助手";
  if (role === "system") return "系统";
  return role;
}

function translateStatus(status: string) {
  if (status === "streaming") return "生成中";
  if (status === "submitted") return "已提交";
  if (status === "error") return "出错";
  return "就绪";
}

function translateToolState(state: unknown) {
  switch (state) {
    case "input-available":
    case "input-streaming":
    case "loading":
    case "streaming":
      return "执行中";
    case "output-available":
    case "complete":
      return "已完成";
    case "output-error":
    case "error":
      return "执行失败";
    default:
      return typeof state === "string" ? state : "工具事件";
  }
}

function tryParseToolCallText(text: string): ToolLikePayload | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.includes('"name"')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as ToolLikePayload;
    if (!parsed || typeof parsed.name !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const panelStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  background: "#fff"
} as const;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12
} as const;

const titleStyle = { margin: 0, fontSize: "1.1rem" } as const;
const metaStyle = { margin: "4px 0 0", color: "#57606a" } as const;
const emptyStyle = { color: "#57606a" } as const;
const messageListStyle = { display: "grid", gap: 12, minHeight: 240, marginBottom: 16 } as const;
const messageStyle = { padding: 12, borderRadius: 10, background: "#f6f8fa" } as const;
const roleStyle = { display: "inline-block", marginBottom: 8 } as const;
const partStackStyle = { display: "grid", gap: 8 } as const;
const textPartStyle = { margin: 0, lineHeight: 1.6 } as const;
const stepDividerStyle = { fontSize: 12, color: "#57606a" } as const;
const rawPartStyle = { margin: 0, background: "#fff", borderRadius: 8, padding: 10, overflowX: "auto" } as const;
const toolCardStyle = { border: "1px solid #d8dee4", background: "#fff", borderRadius: 10, padding: 12, display: "grid", gap: 8 } as const;
const toolHeaderStyle = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } as const;
const toolStateStyle = { fontSize: 12, color: "#57606a" } as const;
const toolLabelStyle = { fontSize: 12, color: "#57606a", marginBottom: 4 } as const;
const toolErrorLabelStyle = { fontSize: 12, color: "#cf222e", marginBottom: 4 } as const;
const toolPreStyle = { margin: 0, background: "#f6f8fa", borderRadius: 8, padding: 10, overflowX: "auto", whiteSpace: "pre-wrap" as const } as const;
const toolErrorPreStyle = { ...toolPreStyle, color: "#cf222e" } as const;
const composerStyle = { display: "flex", gap: 8 } as const;
const inputStyle = { flex: 1, padding: 10, borderRadius: 8, border: "1px solid #d0d7de" } as const;
const buttonStyle = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#0969da", color: "#fff" } as const;
