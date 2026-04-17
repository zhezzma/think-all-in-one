import { useState } from "react";
import type { UIMessage } from "ai";

type ChatShellProps = {
  messages: UIMessage[];
  status?: string;
  onSendMessage(message: string): Promise<void> | void;
};

export function ChatShell({ messages, status = "ready", onSendMessage }: ChatShellProps) {
  const [draft, setDraft] = useState("");

  return (
    <section style={panelStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Assistant chat</h2>
          <p style={metaStyle}>Streaming through useAgentChat()</p>
        </div>
        <span aria-label="chat-status">{status}</span>
      </header>

      <div style={messageListStyle} aria-label="chat-messages">
        {messages.length === 0 ? (
          <p style={emptyStyle}>Start the conversation with the main assistant.</p>
        ) : (
          messages.map((message) => (
            <article key={message.id} style={messageStyle}>
              <strong>{message.role}</strong>
              <div>
                {message.parts.map((part, index) =>
                  part.type === "text" ? <p key={index}>{part.text}</p> : null
                )}
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
          aria-label="Message input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask the assistant to plan, explain, or execute."
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle} disabled={status === "streaming"}>
          Send
        </button>
      </form>
    </section>
  );
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
const composerStyle = { display: "flex", gap: 8 } as const;
const inputStyle = { flex: 1, padding: 10, borderRadius: 8, border: "1px solid #d0d7de" } as const;
const buttonStyle = { padding: "10px 16px", borderRadius: 8, border: "none", background: "#0969da", color: "#fff" } as const;
