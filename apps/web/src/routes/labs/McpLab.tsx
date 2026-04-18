const mcpSurface = {
  status: "disabled",
  config: {
    enabled: false,
    transport: "surface-only",
    configuredServers: []
  },
  diagnostics: {
    serverCount: 0,
    enabledServerCount: 0,
    limitations: [
      "This scaffold currently exposes inspectable MCP status/configuration state, but it does not attach live MCP transports or remote servers yet."
    ]
  }
} as const;

export function McpLab() {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>MCP 实验室</h2>
      <p style={copyStyle}>
        当前 MCP 仍然是可观察的表面状态展示，还没有接入真正的在线传输层；这样更便于在 UI 里理解原型行为。
      </p>
      <pre style={preStyle}>{JSON.stringify(mcpSurface, null, 2)}</pre>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const preStyle = { margin: 0, background: "#f6f8fa", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;
