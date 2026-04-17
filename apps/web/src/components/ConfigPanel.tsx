import type { AssistantConfigDraft } from "../lib/agent";

type ConfigPanelProps = {
  config: AssistantConfigDraft;
  onChange(update: Partial<AssistantConfigDraft>): void;
  onApply(): Promise<void> | void;
};

export function ConfigPanel({ config, onChange, onApply }: ConfigPanelProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Assistant config</h2>
      <p style={copyStyle}>Per-chat config draft for the active agent session.</p>
      <label style={fieldStyle}>
        <span>Model</span>
        <input
          value={config.model}
          onChange={(event) => onChange({ model: event.target.value })}
        />
      </label>
      <label style={fieldStyle}>
        <span>System prompt</span>
        <textarea
          rows={8}
          value={config.systemPrompt}
          onChange={(event) => onChange({ systemPrompt: event.target.value })}
        />
      </label>
      <button type="button" onClick={() => void onApply()}>
        Apply draft
      </button>
    </section>
  );
}

const panelStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  background: "#fff",
  display: "grid",
  gap: 12
} as const;
const titleStyle = { margin: 0 } as const;
const copyStyle = { margin: "-4px 0 0", color: "#57606a", fontSize: 13 } as const;
const fieldStyle = { display: "grid", gap: 6 } as const;
