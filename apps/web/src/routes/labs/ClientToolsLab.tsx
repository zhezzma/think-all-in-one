import type { ClientToolEntry } from "../../lib/clientTools";

export type ClientToolsLabProps = {
  tools: ClientToolEntry[];
  onRunTool: (id: string) => void;
  onRunAll: () => void;
};

export function ClientToolsLab({ tools, onRunTool, onRunAll }: ClientToolsLabProps) {
  return (
    <section style={panelStyle}>
      <div style={headerStyle}>
        <div>
          <h2 style={titleStyle}>Client tools lab</h2>
          <p style={copyStyle}>
            Browser-side tools are registered at boot, marked ready, then executed to capture an inspectable snapshot.
          </p>
        </div>
        <button type="button" style={buttonStyle} onClick={onRunAll}>
          Re-run all tools
        </button>
      </div>

      <div style={tableStyle}>
        {tools.map((tool) => (
          <article key={tool.id} style={toolCardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <h3 style={cardTitleStyle}>{tool.name}</h3>
                <p style={cardCopyStyle}>{tool.description}</p>
              </div>
              <button type="button" style={secondaryButtonStyle} onClick={() => onRunTool(tool.id)}>
                Run tool
              </button>
            </div>

            <div style={metaRowStyle}>
              <span style={badgeStyle}>{tool.lifecycle}</span>
              <span style={badgeStyle}>{tool.category}</span>
              <span style={badgeStyle}>runs: {tool.runCount}</span>
            </div>

            <pre style={preStyle}>
              {JSON.stringify(
                {
                  registeredAt: tool.registeredAt,
                  lastRunAt: tool.lastRunAt,
                  lastResult: tool.lastResult ?? null,
                  lastError: tool.lastError ?? null
                },
                null,
                2
              )}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const headerStyle = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", marginBottom: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: 0, color: "#57606a", maxWidth: 760 } as const;
const tableStyle = { display: "grid", gap: 12 } as const;
const toolCardStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa" } as const;
const cardHeaderStyle = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" } as const;
const cardTitleStyle = { margin: 0 } as const;
const cardCopyStyle = { margin: "4px 0 0", color: "#57606a" } as const;
const metaRowStyle = { display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" } as const;
const badgeStyle = { borderRadius: 999, background: "#eaeef2", padding: "2px 8px", fontSize: 12 } as const;
const preStyle = { margin: 0, background: "#fff", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;
const buttonStyle = { border: "1px solid #1f6feb", background: "#1f6feb", color: "#fff", borderRadius: 8, padding: "8px 12px", cursor: "pointer" } as const;
const secondaryButtonStyle = { border: "1px solid #d0d7de", background: "#fff", color: "#111827", borderRadius: 8, padding: "8px 12px", cursor: "pointer" } as const;
