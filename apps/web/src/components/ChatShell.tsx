import { useState, type ReactNode } from "react";
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

type StructuredTextSegment =
  | { type: "paragraph"; text: string }
  | { type: "reasoning"; text: string; state?: string }
  | {
      type: "tool";
      name: string;
      stateLabel?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
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
                    return renderStructuredTextPart(part.text, `${message.id}-text-${index}`);
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

function renderStructuredTextPart(text: string, keyPrefix: string) {
  const segments = parseStructuredTextSegments(text);

  return segments.map((segment, index) => {
    const key = `${keyPrefix}-${index}`;

    if (segment.type === "reasoning") {
      return (
        <ReasoningCard
          key={key}
          text={segment.text}
          stateLabel={translateReasoningState(segment.state)}
        />
      );
    }

    if (segment.type === "tool") {
      return (
        <ToolCallCard
          key={key}
          title={`工具调用：${segment.name}`}
          stateLabel={segment.stateLabel ?? "工具事件"}
          input={segment.input}
          output={segment.output}
          errorText={segment.errorText}
        />
      );
    }

    const inferredToolCall = tryParseToolCallText(segment.text);
    if (inferredToolCall) {
      return (
        <ToolCallCard
          key={key}
          title={`工具调用：${inferredToolCall.name}`}
          stateLabel="模型输出的工具调用"
          input={inferredToolCall.arguments}
        />
      );
    }

    return <p key={key} style={textPartStyle}>{segment.text}</p>;
  });
}

function ReasoningCard({ text, stateLabel }: { text: string; stateLabel: string }) {
  return (
    <CollapsibleCard
      title="思考过程"
      meta={stateLabel}
      content={
        <pre style={reasoningPreStyle}>{text}</pre>
      }
    />
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
    <CollapsibleCard
      title={title}
      meta={stateLabel}
      content={
        <div style={toolBodyStyle}>
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
        </div>
      }
    />
  );
}

function CollapsibleCard({ title, meta, content }: { title: string; meta: string; content: ReactNode }) {
  return (
    <details style={collapsibleCardStyle}>
      <summary style={collapsibleSummaryStyle}>
        <span style={collapsibleTitleWrapStyle}>
          <strong>{title}</strong>
          <span style={collapsibleHintStyle}>点击展开</span>
        </span>
        <span style={toolStateStyle}>{meta}</span>
      </summary>
      <div style={collapsibleBodyStyle}>{content}</div>
    </details>
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

function translateReasoningState(state: unknown) {
  switch (state) {
    case "done":
    case "complete":
      return "已完成";
    case "streaming":
    case "loading":
      return "思考中";
    default:
      return typeof state === "string" ? state : "已记录";
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

function parseStructuredTextSegments(text: string): StructuredTextSegment[] {
  const lines = text.split(/\r?\n/);
  const segments: StructuredTextSegment[] = [];
  let index = 0;

  while (index < lines.length) {
    const trimmed = lines[index].trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === "步骤") {
      const reasoningAfterStep = collectReasoningSegment(lines, index + 1);
      if (reasoningAfterStep) {
        segments.push(reasoningAfterStep.segment);
        index = reasoningAfterStep.nextIndex;
        continue;
      }
      index += 1;
      continue;
    }

    const directReasoning = collectReasoningSegment(lines, index);
    if (directReasoning) {
      segments.push(directReasoning.segment);
      index = directReasoning.nextIndex;
      continue;
    }

    if (trimmed.startsWith("工具调用：")) {
      const toolSegment = collectToolSegment(lines, index);
      segments.push(toolSegment.segment);
      index = toolSegment.nextIndex;
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && !isTranscriptBoundary(lines, index)) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    const paragraphText = paragraphLines.join("\n").trim();
    if (paragraphText) {
      segments.push({ type: "paragraph", text: paragraphText });
    }
  }

  return segments.length > 0 ? segments : [{ type: "paragraph", text: text.trim() }];
}

function collectReasoningSegment(lines: string[], startIndex: number) {
  const index = skipBlankLines(lines, startIndex);
  const jsonBlock = collectJsonBlock(lines, index);
  if (!jsonBlock) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonBlock.text) as { type?: string; text?: string; state?: string };
    if (parsed.type !== "reasoning" || typeof parsed.text !== "string") {
      return null;
    }

    return {
      segment: {
        type: "reasoning" as const,
        text: parsed.text,
        state: parsed.state
      },
      nextIndex: jsonBlock.nextIndex
    };
  } catch {
    return null;
  }
}

function collectToolSegment(lines: string[], startIndex: number) {
  const firstLine = lines[startIndex].trim();
  const name = firstLine.replace(/^工具调用：/, "").trim() || "未知工具";
  let index = skipBlankLines(lines, startIndex + 1);
  let stateLabel: string | undefined;
  let input: unknown;
  let output: unknown;
  let errorText: string | undefined;

  if (index < lines.length) {
    const candidate = lines[index].trim();
    if (candidate && !isToolFieldLabel(candidate) && !isTranscriptBoundary(lines, index)) {
      const maybeJson = collectJsonBlock(lines, index);
      if (!maybeJson) {
        stateLabel = candidate;
        index += 1;
      }
    }
  }

  while (index < lines.length) {
    index = skipBlankLines(lines, index);
    if (index >= lines.length || isTranscriptBoundary(lines, index)) {
      break;
    }

    const current = lines[index].trim();

    if (current === "输入") {
      const section = collectSectionValue(lines, index + 1);
      input = section.value;
      index = section.nextIndex;
      continue;
    }

    if (current === "输出") {
      const section = collectSectionValue(lines, index + 1);
      output = section.value;
      index = section.nextIndex;
      continue;
    }

    if (current === "错误") {
      const section = collectSectionValue(lines, index + 1);
      errorText = typeof section.value === "string" ? section.value : JSON.stringify(section.value, null, 2);
      index = section.nextIndex;
      continue;
    }

    if (!stateLabel) {
      stateLabel = current;
      index += 1;
      continue;
    }

    break;
  }

  return {
    segment: {
      type: "tool" as const,
      name,
      stateLabel: stateLabel ?? "工具事件",
      input,
      output,
      errorText
    },
    nextIndex: index
  };
}

function collectSectionValue(lines: string[], startIndex: number) {
  const index = skipBlankLines(lines, startIndex);
  const jsonBlock = collectJsonBlock(lines, index);
  if (jsonBlock) {
    try {
      return {
        value: JSON.parse(jsonBlock.text) as unknown,
        nextIndex: jsonBlock.nextIndex
      };
    } catch {
      return {
        value: jsonBlock.text,
        nextIndex: jsonBlock.nextIndex
      };
    }
  }

  const valueLines: string[] = [];
  let cursor = index;
  while (cursor < lines.length && !isTranscriptBoundary(lines, cursor) && !isToolFieldLabel(lines[cursor].trim())) {
    valueLines.push(lines[cursor]);
    cursor += 1;
  }

  return {
    value: valueLines.join("\n").trim(),
    nextIndex: cursor
  };
}

function collectJsonBlock(lines: string[], startIndex: number) {
  if (startIndex >= lines.length) {
    return null;
  }

  const firstLine = lines[startIndex].trim();
  if (!(firstLine.startsWith("{") || firstLine.startsWith("["))) {
    return null;
  }

  let candidate = "";
  for (let index = startIndex; index < lines.length; index += 1) {
    candidate = candidate ? `${candidate}\n${lines[index]}` : lines[index];
    try {
      JSON.parse(candidate);
      return {
        text: candidate.trim(),
        nextIndex: index + 1
      };
    } catch {
      continue;
    }
  }

  return null;
}

function isTranscriptBoundary(lines: string[], index: number) {
  const trimmed = lines[index]?.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed === "步骤" || trimmed.startsWith("工具调用：")) {
    return true;
  }

  const jsonBlock = collectJsonBlock(lines, index);
  if (!jsonBlock) {
    return false;
  }

  try {
    const parsed = JSON.parse(jsonBlock.text) as { type?: string };
    return parsed.type === "reasoning";
  } catch {
    return false;
  }
}

function isToolFieldLabel(text: string) {
  return text === "输入" || text === "输出" || text === "错误";
}

function skipBlankLines(lines: string[], index: number) {
  let cursor = index;
  while (cursor < lines.length && !lines[cursor].trim()) {
    cursor += 1;
  }
  return cursor;
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
const textPartStyle = { margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" as const } as const;
const stepDividerStyle = { fontSize: 12, color: "#57606a" } as const;
const rawPartStyle = { margin: 0, background: "#fff", borderRadius: 8, padding: 10, overflowX: "auto" } as const;
const collapsibleCardStyle = { border: "1px solid #d8dee4", background: "#fff", borderRadius: 10, overflow: "hidden" } as const;
const collapsibleSummaryStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, cursor: "pointer", padding: 12, listStyle: "none" } as const;
const collapsibleTitleWrapStyle = { display: "grid", gap: 4 } as const;
const collapsibleHintStyle = { fontSize: 12, color: "#57606a" } as const;
const collapsibleBodyStyle = { padding: "0 12px 12px", display: "grid", gap: 8 } as const;
const toolBodyStyle = { display: "grid", gap: 8 } as const;
const toolStateStyle = { fontSize: 12, color: "#57606a" } as const;
const toolLabelStyle = { fontSize: 12, color: "#57606a", marginBottom: 4 } as const;
const toolErrorLabelStyle = { fontSize: 12, color: "#cf222e", marginBottom: 4 } as const;
const toolPreStyle = { margin: 0, background: "#f6f8fa", borderRadius: 8, padding: 10, overflowX: "auto", whiteSpace: "pre-wrap" as const } as const;
const toolErrorPreStyle = { ...toolPreStyle, color: "#cf222e" } as const;
const reasoningPreStyle = { ...toolPreStyle, lineHeight: 1.6 } as const;
const composerStyle = { display: "flex", gap: 8 } as const;
const inputStyle = { flex: 1, padding: 10, borderRadius: 8, border: "1px solid #d0d7de" } as const;
const buttonStyle = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#0969da", color: "#fff" } as const;
