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
      <h2 style={titleStyle}>MCP lab</h2>
      <p style={copyStyle}>
        Current MCP support is inspectable surface state only, which makes the prototype easy to reason about in the UI.
      </p>
      <pre style={preStyle}>{JSON.stringify(mcpSurface, null, 2)}</pre>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const preStyle = { margin: 0, background: "#f6f8fa", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;
