import type { ExtensionCatalog } from "../../lib/agent";

export type ExtensionsLabProps = {
  extensionCatalog: ExtensionCatalog;
  onUpdateEnabledExtensions: (enabledExtensions: string[]) => Promise<void>;
};

export function ExtensionsLab({ extensionCatalog, onUpdateEnabledExtensions }: ExtensionsLabProps) {
  const enabledIds = extensionCatalog.extensions
    .filter((extension) => extension.enabled)
    .map((extension) => extension.id);

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>扩展实验室</h2>
      <p style={copyStyle}>
        这里展示在线扩展目录，并可通过持久化助手配置启用或禁用可用扩展。
      </p>

      <div style={summaryRowStyle}>
        <span style={badgeStyle}>可用：{extensionCatalog.count}</span>
        <span style={badgeStyle}>已启用：{enabledIds.length}</span>
      </div>

      <ul style={listStyle}>
        {extensionCatalog.extensions.map((extension) => {
          const nextEnabledIds = extension.enabled
            ? enabledIds.filter((id) => id !== extension.id)
            : [...enabledIds, extension.id];

          return (
            <li key={extension.id} style={listItemStyle}>
              <div>
                <strong>{extension.name}</strong>
                <div style={mutedStyle}>{extension.description}</div>
                <div style={metaStyle}>{extension.id} · v{extension.version}</div>
              </div>
              <div style={rightColumnStyle}>
                <span style={extension.enabled ? enabledTextStyle : disabledTextStyle}>
                  {extension.enabled ? "已启用" : "已禁用"}
                </span>
                <input
                  aria-label={`切换扩展 ${extension.id}`}
                  type="checkbox"
                  checked={extension.enabled}
                  onChange={() => {
                    void onUpdateEnabledExtensions(nextEnabledIds);
                  }}
                />
              </div>
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
const badgeStyle = { borderRadius: 999, background: "#eaeef2", padding: "2px 8px", fontSize: 12 } as const;
const listStyle = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 } as const;
const listItemStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" } as const;
const mutedStyle = { color: "#57606a", marginTop: 4 } as const;
const metaStyle = { color: "#57606a", marginTop: 4, fontSize: 12 } as const;
const rightColumnStyle = { display: "grid", gap: 8, justifyItems: "end" } as const;
const enabledTextStyle = { color: "#1a7f37", fontWeight: 600 } as const;
const disabledTextStyle = { color: "#57606a", fontWeight: 600 } as const;
