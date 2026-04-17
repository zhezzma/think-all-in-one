const subagents = [
  {
    id: "ResearchSubAgent",
    role: "Research specialist",
    focus: "Collect facts, clarify unknowns, and return concise findings."
  },
  {
    id: "MemorySubAgent",
    role: "Memory specialist",
    focus: "Capture durable facts, preferences, and reusable summaries."
  },
  {
    id: "OpsSubAgent",
    role: "Operations specialist",
    focus: "Support runbooks, execution plans, and incident-style reasoning."
  }
];

export function SubagentsLab() {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Sub-agents lab</h2>
      <p style={copyStyle}>
        Inspect the currently scaffolded specialist agents exposed by the worker package.
      </p>
      <ul style={listStyle}>
        {subagents.map((agent) => (
          <li key={agent.id} style={listItemStyle}>
            <strong>{agent.id}</strong>
            <div style={mutedStyle}>{agent.role}</div>
            <div>{agent.focus}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const listStyle = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 } as const;
const listItemStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa" } as const;
const mutedStyle = { color: "#57606a", margin: "4px 0" } as const;
