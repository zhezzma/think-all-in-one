import type { AgentEvent } from "../lib/agent";

type EventLogProps = {
  events: AgentEvent[];
};

export function EventLog({ events }: EventLogProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>事件日志</h2>
      <ul style={listStyle}>
        {events.map((event) => (
          <li key={event.id} style={itemStyle}>
            <details style={detailsStyle}>
              <summary style={summaryStyle}>
                <span style={summaryMainStyle}>
                  <strong>{event.type}</strong>
                  <span style={summaryHintStyle}>点击展开</span>
                </span>
                <small>{event.timestamp}</small>
              </summary>
              <div style={detailBodyStyle}>{event.detail}</div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

const panelStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  background: "#fff"
} as const;
const titleStyle = { marginTop: 0 } as const;
const listStyle = { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 } as const;
const itemStyle = { background: "#f6f8fa", borderRadius: 10 } as const;
const detailsStyle = { borderRadius: 10, overflow: "hidden" } as const;
const summaryStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  cursor: "pointer",
  padding: 10,
  listStyle: "none"
} as const;
const summaryMainStyle = { display: "grid", gap: 4 } as const;
const summaryHintStyle = { fontSize: 12, color: "#57606a" } as const;
const detailBodyStyle = { padding: "0 10px 10px", lineHeight: 1.6, whiteSpace: "pre-wrap" as const } as const;
