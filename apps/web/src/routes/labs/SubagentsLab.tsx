const subagents = [
  {
    id: "ResearchSubAgent",
    role: "研究专员",
    focus: "负责收集事实、澄清未知信息，并返回简洁结论。"
  },
  {
    id: "MemorySubAgent",
    role: "记忆专员",
    focus: "负责整理持久事实、偏好和可复用摘要。"
  },
  {
    id: "OpsSubAgent",
    role: "运维专员",
    focus: "负责运行手册、执行计划和偏事故处置式推理。"
  }
];

export function SubagentsLab() {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>子代理实验室</h2>
      <p style={copyStyle}>
        这里展示当前 worker 暴露出来的专用子代理，以及它们各自的职责分工。
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
