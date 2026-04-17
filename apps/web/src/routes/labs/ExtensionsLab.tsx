const extensionSurface = {
  count: 1,
  extensions: [
    {
      id: "example-extension",
      name: "Example Extension",
      version: "0.1.0",
      description: "Demonstrates a pragmatic extension registration surface for the Think scaffold.",
      status: "loaded",
      capabilities: ["registry", "diagnostics"]
    }
  ],
  diagnostics: {
    loadedCount: 1,
    extensionIds: ["example-extension"],
    limitations: [
      "This scaffold currently exposes extensions through a static registry surface instead of dynamic runtime plugin loading."
    ]
  }
} as const;

export function ExtensionsLab() {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Extensions lab</h2>
      <p style={copyStyle}>
        Extensions are currently surfaced from a static registry, which keeps the integration inspectable without runtime plugin loading.
      </p>
      <pre style={preStyle}>{JSON.stringify(extensionSurface, null, 2)}</pre>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const preStyle = { margin: 0, background: "#f6f8fa", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;
