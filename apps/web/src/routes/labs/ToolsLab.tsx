import type { ToolCatalog } from "../../lib/agent";
import type { ClientToolEntry } from "../../lib/clientTools";

export type ToolsLabProps = {
  toolCatalog: ToolCatalog;
  onUpdateEnabledTools: (enabledTools: string[]) => Promise<void>;
  clientTools?: ClientToolEntry[];
};

export function ToolsLab({ toolCatalog, onUpdateEnabledTools }: ToolsLabProps) {
  const enabledIds = toolCatalog.tools.filter((tool) => tool.enabled).map((tool) => tool.id);

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Tools lab</h2>
      <p style={copyStyle}>
        Manage the live server tool catalog exposed by MainAssistantAgent. Toggle individual tools
        and persist the enabled set through backend callables.
      </p>

      <div style={summaryRowStyle}>
        <span style={badgeStyle}>catalog: {toolCatalog.count}</span>
        <span style={badgeStyle}>enabled: {toolCatalog.enabledCount}</span>
      </div>

      <ul style={listStyle}>
        {toolCatalog.tools.map((tool) => {
          const nextEnabledIds = tool.enabled
            ? enabledIds.filter((id) => id !== tool.id)
            : [...enabledIds, tool.id];

          return (
            <li key={tool.id} style={listItemStyle}>
              <div>
                <strong>{tool.id}</strong>
                <div style={mutedStyle}>{tool.description}</div>
              </div>
              <label style={toggleRowStyle}>
                <span style={tool.enabled ? enabledTextStyle : disabledTextStyle}>
                  {tool.enabled ? "Enabled" : "Disabled"}
                </span>
                <input
                  aria-label={`Toggle tool ${tool.id}`}
                  type="checkbox"
                  checked={tool.enabled}
                  onChange={() => {
                    void onUpdateEnabledTools(nextEnabledIds);
                  }}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const summaryRowStyle = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 } as const;
const listStyle = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 } as const;
const listItemStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } as const;
const mutedStyle = { color: "#57606a", marginTop: 4 } as const;
const badgeStyle = { borderRadius: 999, background: "#eaeef2", padding: "2px 8px", fontSize: 12 } as const;
const toggleRowStyle = { display: "flex", gap: 8, alignItems: "center" } as const;
const enabledTextStyle = { color: "#1a7f37", fontWeight: 600 } as const;
const disabledTextStyle = { color: "#57606a", fontWeight: 600 } as const;
