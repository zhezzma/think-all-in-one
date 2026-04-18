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
            <strong>{event.type}</strong>
            <div>{event.detail}</div>
            <small>{event.timestamp}</small>
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
const itemStyle = { padding: 10, background: "#f6f8fa", borderRadius: 10 } as const;
