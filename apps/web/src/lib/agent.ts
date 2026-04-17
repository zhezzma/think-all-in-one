import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";

const DEFAULT_AGENT_NAME = "MainAssistantAgent";
const DEFAULT_INSTANCE_NAME = "main";
export const CONTROL_PLANE_SESSION_ID = "control-plane";
const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const DEFAULT_SYSTEM_PROMPT = [
  "You are the primary Think assistant for think-all-in-one.",
  "Help with implementation, planning, and safe execution."
].join("\n");

export type AssistantConfigDraft = {
  model: string;
  systemPrompt: string;
  identity?: string;
  memoryMaxTokens?: number;
  profileId?: string;
  enabledTools?: string[];
  enabledExtensions?: string[];
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

export type ControlPlaneSessionRecord = {
  id: string;
  title?: string;
  profileId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ControlPlaneAgentProfile = {
  id: string;
  name: string;
  description?: string;
  config: {
    model?: string;
    systemPrompt?: string;
    identity?: string;
    memoryMaxTokens?: number;
    enabledTools?: string[];
    enabledExtensions?: string[];
    profileId?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type ToolCatalogEntry = {
  id: string;
  enabled: boolean;
  description: string;
};

export type ToolCatalog = {
  count: number;
  enabledCount: number;
  tools: ToolCatalogEntry[];
};

export type ExtensionCatalogEntry = {
  id: string;
  name: string;
  version: string;
  description: string;
  status: string;
  capabilities: string[];
  enabled: boolean;
  limitations?: string[];
};

export type ExtensionCatalog = {
  count: number;
  extensions: ExtensionCatalogEntry[];
};

export type ControlPlaneSnapshot = {
  path: string;
  currentSessionId: string;
  document: {
    version: number;
    sessions: ControlPlaneSessionRecord[];
    profiles: ControlPlaneAgentProfile[];
  };
  toolCatalog: ToolCatalog;
  extensionCatalog: ExtensionCatalog;
  assistantConfig: Partial<AssistantConfigDraft>;
};

type SessionRecordInput = {
  id: string;
  title?: string;
  profileId?: string;
};

type AgentProfileInput = {
  id: string;
  name: string;
  description?: string;
  config?: Partial<AssistantConfigDraft>;
};

type MainAgentStub = {
  getAssistantConfig?: () => Promise<Partial<AssistantConfigDraft>>;
  updateAssistantConfig?: (input: Partial<AssistantConfigDraft>) => Promise<Partial<AssistantConfigDraft>>;
  getToolCatalog?: () => Promise<ToolCatalog>;
  updateEnabledTools?: (enabledTools: string[]) => Promise<Partial<AssistantConfigDraft>>;
  getExtensionCatalog?: () => Promise<ExtensionCatalog>;
  updateEnabledExtensions?: (enabledExtensions: string[]) => Promise<Partial<AssistantConfigDraft>>;
  clearSessionHistory?: () => Promise<unknown>;
  getControlPlaneSnapshot?: () => Promise<ControlPlaneSnapshot>;
  createSessionRecord?: (input: SessionRecordInput) => Promise<ControlPlaneSessionRecord>;
  updateSessionRecord?: (input: SessionRecordInput) => Promise<ControlPlaneSessionRecord | null>;
  deleteSessionRecord?: (id: string) => Promise<{ deleted: boolean; id: string }>;
  listAgentProfiles?: () => Promise<ControlPlaneAgentProfile[]>;
  createAgentProfile?: (input: AgentProfileInput) => Promise<ControlPlaneAgentProfile>;
  updateAgentProfile?: (input: AgentProfileInput) => Promise<ControlPlaneAgentProfile | null>;
  deleteAgentProfile?: (id: string) => Promise<{ deleted: boolean; id: string }>;
};

export function useMainAgent(sessionId = DEFAULT_INSTANCE_NAME) {
  return useAgent({
    agent: DEFAULT_AGENT_NAME,
    name: sessionId,
    host: resolveAgentHost()
  });
}

export function useControlPlaneAgent() {
  return useMainAgent(CONTROL_PLANE_SESSION_ID);
}

export function useControlPlaneState() {
  const agent = useControlPlaneAgent();
  const [snapshot, setSnapshot] = useState<ControlPlaneSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requireControlPlaneMethod = useCallback(<K extends keyof MainAgentStub>(method: K) => {
    const stub = getAgentStub(agent);
    const callable = stub[method];
    if (!callable) {
      throw new Error(`MainAssistantAgent does not expose ${String(method)}().`);
    }
    return callable;
  }, [agent]);

  const refresh = useCallback(async () => {
    const stub = getAgentStub(agent);
    if (!stub.getControlPlaneSnapshot) {
      setLoading(false);
      setError("MainAssistantAgent does not expose getControlPlaneSnapshot().");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const nextSnapshot = await stub.getControlPlaneSnapshot();
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } catch (cause) {
      setError(formatErrorDetail("Failed to load control-plane snapshot", cause));
      return null;
    } finally {
      setLoading(false);
    }
  }, [agent]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createSession = useCallback(
    async (input: SessionRecordInput) => {
      const createSessionRecord = requireControlPlaneMethod("createSessionRecord") as NonNullable<MainAgentStub["createSessionRecord"]>;
      await createSessionRecord(input);
      return refresh();
    },
    [refresh, requireControlPlaneMethod]
  );

  const updateSession = useCallback(
    async (input: SessionRecordInput) => {
      const updateSessionRecord = requireControlPlaneMethod("updateSessionRecord") as NonNullable<MainAgentStub["updateSessionRecord"]>;
      await updateSessionRecord(input);
      return refresh();
    },
    [refresh, requireControlPlaneMethod]
  );

  const deleteSession = useCallback(
    async (id: string) => {
      const deleteSessionRecord = requireControlPlaneMethod("deleteSessionRecord") as NonNullable<MainAgentStub["deleteSessionRecord"]>;
      await deleteSessionRecord(id);
      return refresh();
    },
    [refresh, requireControlPlaneMethod]
  );

  const createProfile = useCallback(
    async (input: AgentProfileInput) => {
      const createAgentProfile = requireControlPlaneMethod("createAgentProfile") as NonNullable<MainAgentStub["createAgentProfile"]>;
      await createAgentProfile(input);
      return refresh();
    },
    [refresh, requireControlPlaneMethod]
  );

  const updateProfile = useCallback(
    async (input: AgentProfileInput) => {
      const updateAgentProfile = requireControlPlaneMethod("updateAgentProfile") as NonNullable<MainAgentStub["updateAgentProfile"]>;
      await updateAgentProfile(input);
      return refresh();
    },
    [refresh, requireControlPlaneMethod]
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const deleteAgentProfile = requireControlPlaneMethod("deleteAgentProfile") as NonNullable<MainAgentStub["deleteAgentProfile"]>;
      await deleteAgentProfile(id);
      return refresh();
    },
    [refresh, requireControlPlaneMethod]
  );

  return {
    agent,
    snapshot,
    loading,
    error,
    refresh,
    createSession,
    updateSession,
    deleteSession,
    createProfile,
    updateProfile,
    deleteProfile
  };
}

export function useAssistantUiState(sessionId = DEFAULT_INSTANCE_NAME) {
  const agent = useMainAgent(sessionId);
  const chat = useAgentChat({ agent });

  const [config, setConfig] = useState<AssistantConfigDraft>({
    model: DEFAULT_MODEL,
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  });

  const [toolCatalog, setToolCatalog] = useState<ToolCatalog>({
    count: 0,
    enabledCount: 0,
    tools: []
  });
  const [extensionCatalog, setExtensionCatalog] = useState<ExtensionCatalog>({
    count: 0,
    extensions: []
  });

  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);

  const [events, setEvents] = useState<AgentEvent[]>([
    createEvent("system", `Assistant UI connected to session ${sessionId}.`)
  ]);

  const refreshSessionState = useCallback(async () => {
    const stub = getAgentStub(agent);

    try {
      const [assistantConfig, nextToolCatalog, nextExtensionCatalog] = await Promise.all([
        stub.getAssistantConfig?.(),
        stub.getToolCatalog?.(),
        stub.getExtensionCatalog?.()
      ]);

      if (assistantConfig) {
        setConfig((current) => ({
          ...current,
          ...assistantConfig,
          model: assistantConfig.model ?? current.model,
          systemPrompt: assistantConfig.systemPrompt ?? current.systemPrompt
        }));
      }

      if (nextToolCatalog) {
        setToolCatalog(nextToolCatalog);
      }

      if (nextExtensionCatalog) {
        setExtensionCatalog(nextExtensionCatalog);
      }
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("session.error", formatErrorDetail("Failed to refresh session state", error))
      );
    }
  }, [agent]);

  useEffect(() => {
    void refreshSessionState();
  }, [refreshSessionState, sessionId]);

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

    const stub = getAgentStub(agent);
    if (!stub.updateAssistantConfig) {
      prependEvent(
        setEvents,
        createEvent("config.error", "MainAssistantAgent does not expose updateAssistantConfig().")
      );
      return;
    }

    try {
      const nextConfig = await stub.updateAssistantConfig(config);
      setConfig((current) => ({ ...current, ...nextConfig }));
      await refreshSessionState();
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

  const syncAssistantConfig = async (update: Partial<AssistantConfigDraft>) => {
    const stub = getAgentStub(agent);
    if (!stub.updateAssistantConfig) {
      prependEvent(
        setEvents,
        createEvent("config.error", "MainAssistantAgent does not expose updateAssistantConfig().")
      );
      return;
    }

    try {
      const nextConfig = await stub.updateAssistantConfig(update);
      setConfig((current) => ({ ...current, ...nextConfig }));
      await refreshSessionState();
      prependEvent(
        setEvents,
        createEvent("config.synced", `Applied assistant config patch (${Object.keys(update).join(", ") || "no-op"}).`)
      );
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("config.error", formatErrorDetail("Failed to apply assistant config patch", error))
      );
    }
  };

  const updateEnabledTools = async (enabledTools: string[]) => {
    const stub = getAgentStub(agent);
    if (!stub.updateEnabledTools) {
      prependEvent(
        setEvents,
        createEvent("tools.error", "MainAssistantAgent does not expose updateEnabledTools().")
      );
      return;
    }

    try {
      const nextConfig = await stub.updateEnabledTools(enabledTools);
      setConfig((current) => ({ ...current, ...nextConfig, enabledTools: nextConfig.enabledTools }));
      await refreshSessionState();
      prependEvent(
        setEvents,
        createEvent("tools.synced", `Updated enabled tools (${enabledTools.join(", ") || "none"}).`)
      );
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("tools.error", formatErrorDetail("Failed to update enabled tools", error))
      );
    }
  };

  const updateEnabledExtensions = async (enabledExtensions: string[]) => {
    const stub = getAgentStub(agent);
    if (!stub.updateEnabledExtensions) {
      prependEvent(
        setEvents,
        createEvent("extensions.error", "MainAssistantAgent does not expose updateEnabledExtensions().")
      );
      return;
    }

    try {
      const nextConfig = await stub.updateEnabledExtensions(enabledExtensions);
      setConfig((current) => ({
        ...current,
        ...nextConfig,
        enabledExtensions: nextConfig.enabledExtensions
      }));
      await refreshSessionState();
      prependEvent(
        setEvents,
        createEvent(
          "extensions.synced",
          `Updated enabled extensions (${enabledExtensions.join(", ") || "none"}).`
        )
      );
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("extensions.error", formatErrorDetail("Failed to update enabled extensions", error))
      );
    }
  };

  const resolveApproval = (id: string, status: ApprovalItem["status"]) => {
    setApprovals((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
    prependEvent(setEvents, createEvent("approval", `Marked ${id} as ${status}.`));
  };

  const clearHistory = async () => {
    const stub = getAgentStub(agent);

    try {
      await stub.clearSessionHistory?.();
      chat.clearHistory();
      prependEvent(setEvents, createEvent("chat.clear", `Cleared transcript for session ${sessionId}.`));
    } catch (error) {
      prependEvent(
        setEvents,
        createEvent("chat.error", formatErrorDetail("Failed to clear session history", error))
      );
    }
  };

  return {
    agent,
    chat,
    config,
    toolCatalog,
    extensionCatalog,
    approvals,
    events,
    summary,
    submitMessage,
    updateConfig,
    applyConfig,
    updateEnabledTools,
    updateEnabledExtensions,
    syncAssistantConfig,
    refreshSessionState,
    resolveApproval,
    clearHistory,
    sessionId
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

function getAgentStub(agent: unknown): MainAgentStub {
  return ((agent as { stub?: MainAgentStub }).stub ?? {}) as MainAgentStub;
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
