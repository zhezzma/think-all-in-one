import type { ClientToolEntry } from "../../lib/clientTools";

export type ToolsLabProps = {
  clientTools: ClientToolEntry[];
};

const serverTools = [
  {
    id: "diagnostics",
    description: "Returns workspace info, persisted config, and integration surfaces."
  },
  {
    id: "notes",
    description: "Persists assistant notes in the workspace."
  },
  {
    id: "protected_delete",
    description: "Deletes files with approval gates for protected paths."
  }
];

export function ToolsLab({ clientTools }: ToolsLabProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Tools lab</h2>
      <p style={copyStyle}>
        Compare scaffolded server tools with browser-side client tools registered in this app.
      </p>

      <div style={columnsStyle}>
        <section>
          <h3 style={sectionTitleStyle}>Server tools</h3>
          <ul style={listStyle}>
            {serverTools.map((tool) => (
              <li key={tool.id} style={listItemStyle}>
                <strong>{tool.id}</strong>
                <div style={mutedStyle}>{tool.description}</div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 style={sectionTitleStyle}>Client tools</h3>
          <ul style={listStyle}>
            {clientTools.map((tool) => (
              <li key={tool.id} style={listItemStyle}>
                <strong>{tool.name}</strong>
                <div style={mutedStyle}>{tool.description}</div>
                <div style={badgeRowStyle}>
                  <span style={badgeStyle}>{tool.category}</span>
                  <span style={badgeStyle}>{tool.lifecycle}</span>
                  <span style={badgeStyle}>runs: {tool.runCount}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const columnsStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 } as const;
const sectionTitleStyle = { margin: "0 0 8px" } as const;
const listStyle = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 } as const;
const listItemStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa" } as const;
const mutedStyle = { color: "#57606a", marginTop: 4 } as const;
const badgeRowStyle = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 } as const;
const badgeStyle = { borderRadius: 999, background: "#eaeef2", padding: "2px 8px", fontSize: 12 } as const;
