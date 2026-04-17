import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";

const DEFAULT_AGENT_NAME = "MainAssistantAgent";
const DEFAULT_INSTANCE_NAME = "main";

export type AssistantConfigDraft = {
  model: string;
  systemPrompt: string;
};

export type ApprovalItem = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "approved" | "rejected";
};

export type AgentEvent = {
  id: string;
  timestamp: string;
  type: string;
  detail: string;
};

export function useMainAgent() {
  return useAgent({
    agent: DEFAULT_AGENT_NAME,
    name: DEFAULT_INSTANCE_NAME,
    host: resolveAgentHost()
  });
}

export function useAssistantUiState() {
  const agent = useMainAgent();
  const chat = useAgentChat({ agent });

  const [config, setConfig] = useState<AssistantConfigDraft>({
    model: "@cf/meta/llama-3.1-8b-instruct",
    systemPrompt: [
      "You are the primary Think assistant for think-all-in-one.",
      "Help with implementation, planning, and safe execution."
    ].join("\n")
  });

  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    {
      id: "approval-protected-delete",
      title: "Protected delete",
      description: "Deleting protected workspace paths must be explicitly approved.",
      status: "pending"
    }
  ]);

  const [events, setEvents] = useState<AgentEvent[]>([
    createEvent("system", "Assistant UI connected to MainAssistantAgent.")
  ]);

  const messageCount = chat.messages.length;
  const connectionState = (agent as { status?: string }).status ?? "connected";

  const summary = useMemo(
    () => ({
      messageCount,
      connectionState,
      pendingApprovals: approvals.filter((item) => item.status === "pending").length
    }),
    [approvals, connectionState, messageCount]
  );

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    prependEvent(setEvents, createEvent("chat.user", `Queued user message: ${trimmed}`));

    try {
      await chat.sendMessage({ text: trimmed });
      prependEvent(
        setEvents,
        createEvent("chat.agent", "Sent message to MainAssistantAgent via useAgentChat().")
      );
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("chat.error", formatErrorDetail("Failed to send message", error))
      );
    }
  };

  const updateConfig = (update: Partial<AssistantConfigDraft>) => {
    setConfig((current) => ({ ...current, ...update }));
    prependEvent(
      setEvents,
      createEvent("config", `Updated local config draft (${Object.keys(update).join(", ") || "no-op"}).`)
    );
  };

  const applyConfig = async () => {
    prependEvent(
      setEvents,
      createEvent("config.apply", "Attempted to sync config draft to MainAssistantAgent.")
    );

    const stub = (agent as { stub?: { updateAssistantConfig?: (input: AssistantConfigDraft) => Promise<unknown> } }).stub;
    if (!stub?.updateAssistantConfig) {
      prependEvent(
        setEvents,
        createEvent("config.error", "MainAssistantAgent does not expose updateAssistantConfig().")
      );
      return;
    }

    try {
      await stub.updateAssistantConfig(config);
      prependEvent(
        setEvents,
        createEvent("config.synced", "Synced local config draft to MainAssistantAgent.")
      );
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("config.error", formatErrorDetail("Failed to sync config draft", error))
      );
    }
  };

  const resolveApproval = (id: string, status: ApprovalItem["status"]) => {
    setApprovals((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
    prependEvent(setEvents, createEvent("approval", `Marked ${id} as ${status}.`));
  };

  return {
    agent,
    chat,
    config,
    approvals,
    events,
    summary,
    submitMessage,
    updateConfig,
    applyConfig,
    resolveApproval
  };
}

export function resolveAgentHost() {
  const configured = import.meta.env.VITE_AGENT_HOST;
  if (configured) {
    return configured;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:8787";
}

function createEvent(type: string, detail: string): AgentEvent {
  return {
    id: `${type}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: new Date().toISOString(),
    type,
    detail
  };
}

function formatErrorDetail(prefix: string, error: unknown): string {
  if (error instanceof Error && error.message) {
    return `${prefix}: ${error.message}`;
  }

  return prefix;
}

function prependEvent(
  setEvents: Dispatch<SetStateAction<AgentEvent[]>>,
  event: AgentEvent
) {
  setEvents((current) => [event, ...current]);
}
