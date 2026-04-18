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
      <h2 style={titleStyle}>工具实验室</h2>
      <p style={copyStyle}>
        这里管理 MainAssistantAgent 当前暴露出来的在线服务端工具目录。你可以切换单个工具，并通过后端 callable 持久化启用集合。
      </p>

      <div style={summaryRowStyle}>
        <span style={badgeStyle}>目录数量：{toolCatalog.count}</span>
        <span style={badgeStyle}>已启用：{toolCatalog.enabledCount}</span>
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
                  {tool.enabled ? "已启用" : "已禁用"}
                </span>
                <input
                  aria-label={`切换工具 ${tool.id}`}
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
