import type { AssistantConfigDraft } from "../lib/agent";

const MODEL_OPTIONS = [
  { value: "@cf/meta/llama-3.1-8b-instruct", label: "Llama 3.1 8B Instruct" },
  { value: "@cf/meta/llama-3.1-8b-instruct-fast", label: "Llama 3.1 8B Fast" },
  { value: "@cf/meta/llama-3.1-70b-instruct", label: "Llama 3.1 70B Instruct" },
  { value: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", label: "Llama 3.3 70B Fast" },
  { value: "@cf/meta/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B" },
  { value: "@cf/qwen/qwen1.5-7b-chat-awq", label: "Qwen 1.5 7B Chat AWQ" },
  { value: "@cf/qwen/qwen3-30b-a3b-fp8", label: "Qwen 3 30B A3B FP8" },
  { value: "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b", label: "DeepSeek R1 Distill Qwen 32B" },
  { value: "@cf/mistral/mistral-7b-instruct-v0.2-lora", label: "Mistral 7B Instruct v0.2 LoRA" }
] as const;

type ConfigPanelProps = {
  config: AssistantConfigDraft;
  onChange(update: Partial<AssistantConfigDraft>): void;
  onApply(): Promise<void> | void;
};

export function ConfigPanel({ config, onChange, onApply }: ConfigPanelProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>助手配置</h2>
      <p style={copyStyle}>当前会话的配置草稿。这里的改动会同步到当前 agent session。</p>
      <label style={fieldStyle}>
        <span>模型</span>
        <select
          aria-label="模型"
          value={config.model}
          onChange={(event) => onChange({ model: event.target.value })}
          style={inputStyle}
        >
          {MODEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}（{option.value}）
            </option>
          ))}
        </select>
      </label>
      <label style={fieldStyle}>
        <span>系统提示词</span>
        <textarea
          aria-label="系统提示词"
          rows={8}
          value={config.systemPrompt}
          onChange={(event) => onChange({ systemPrompt: event.target.value })}
          style={textareaStyle}
        />
      </label>
      <button type="button" onClick={() => void onApply()} style={buttonStyle}>
        应用配置
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
const inputStyle = { border: "1px solid #d0d7de", borderRadius: 8, padding: "8px 10px", background: "#fff" } as const;
const textareaStyle = { ...inputStyle, resize: "vertical" as const } as const;
const buttonStyle = { border: "none", borderRadius: 999, padding: "10px 14px", background: "#0969da", color: "#fff", cursor: "pointer" } as const;
