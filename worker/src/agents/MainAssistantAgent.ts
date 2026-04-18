/// <reference types="@cloudflare/workers-types" />

import { Think, type Session } from "@cloudflare/think";
import { callable } from "agents";
import type { ToolSet, UIMessage } from "ai";
import type { WorkspaceOptions } from "@cloudflare/shell";

import type { Env } from "../index.js";
import {
  CONTROL_PLANE_DOCUMENT_PATH,
  readControlPlaneDocument,
  writeControlPlaneDocument,
  type ControlPlaneAgentProfile,
  type ControlPlaneDocument,
  type ControlPlaneSessionRecord
} from "../controlPlane/document.js";
import { createExtensionRegistry, type ExtensionRegistry } from "../extensions/registry.js";
import { getDefaultModel } from "../lib/model.js";
import { createMcpState, type McpState } from "../mcp/state.js";
import {
  buildAssistantSystemPrompt,
  configureAssistantSession,
  getAssistantConfigValue
} from "../session/configureAssistantSession.js";
import { createDiagnosticsTool } from "../tools/server/diagnostics.js";
import { createNotesTool } from "../tools/server/notes.js";
import {
  createProtectedDeleteTool,
  type ProtectedPathRule
} from "../tools/server/protectedFiles.js";
import { normalizeAssistantConfig, type AssistantConfig } from "../types/config.js";
import { createWorkspace } from "../workspace/createWorkspace.js";

const MAIN_ASSISTANT_PROTECTED_PATHS: ProtectedPathRule[] = [
  { path: "/", reason: "Deleting the workspace root is always destructive and must be approved." },
  { path: "/system", reason: "System-managed state and assistant metadata." },
  { path: "/notes", reason: "Durable assistant notes should not be deleted casually." },
  { path: "/config", reason: "Configuration files may affect future assistant behavior." },
  { path: "/agents", reason: "Agent scaffolding and coordination artifacts." }
];

interface ToolCatalogEntry {
  id: string;
  enabled: boolean;
  description: string;
}

interface SessionRecordInput {
  id: string;
  title?: string;
  profileId?: string;
}

interface AgentProfileInput {
  id: string;
  name: string;
  description?: string;
  config?: Partial<AssistantConfig>;
}

export class MainAssistantAgent extends Think<Env, AssistantConfig> {
  readonly extensionRegistry: ExtensionRegistry;
  readonly mcpState: McpState;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.workspace = createWorkspace({
      sql: ctx.storage.sql,
      name: () => this.name,
      ...(env.ARTIFACTS
        ? { r2: env.ARTIFACTS as WorkspaceOptions["r2"] }
        : {})
    });
    this.extensionRegistry = createExtensionRegistry();
    this.mcpState = createMcpState();
  }

  private get workerEnv(): Env {
    return (this as unknown as { env: Env }).env;
  }

  private getCurrentSessionId(): string {
    return this.name;
  }

  private getEnabledToolIds(): string[] | undefined {
    return this.getAssistantConfig().enabledTools;
  }

  private getEnabledExtensionIds(): string[] | undefined {
    return this.getAssistantConfig().enabledExtensions;
  }

  private getAllTools(): ToolSet {
    return {
      diagnostics: createDiagnosticsTool({
        workspace: this.workspace,
        getConfig: () => this.getAssistantConfig(),
        protectedPaths: MAIN_ASSISTANT_PROTECTED_PATHS,
        getSurfaces: () => this.getIntegrationSurfaces(),
        getDiagnostics: () => this.getIntegrationDiagnostics()
      }),
      notes: createNotesTool({
        workspace: this.workspace,
        path: "/notes/assistant-notes.json"
      }),
      protected_delete: createProtectedDeleteTool({
        workspace: this.workspace,
        protectedPaths: MAIN_ASSISTANT_PROTECTED_PATHS
      })
    };
  }

  private getToolCatalogEntries(): ToolCatalogEntry[] {
    const enabledTools = this.getEnabledToolIds();
    const usesDefaultEnablement = enabledTools === undefined;

    return [
      {
        id: "diagnostics",
        enabled: usesDefaultEnablement || enabledTools.includes("diagnostics"),
        description: "Inspect workspace, integration surfaces, and protected path diagnostics."
      },
      {
        id: "notes",
        enabled: usesDefaultEnablement || enabledTools.includes("notes"),
        description: "Persist and retrieve durable assistant notes from the workspace."
      },
      {
        id: "protected_delete",
        enabled: usesDefaultEnablement || enabledTools.includes("protected_delete"),
        description: "Delete workspace files and directories with protected path guardrails."
      }
    ];
  }

  private async readControlPlane(): Promise<ControlPlaneDocument> {
    return readControlPlaneDocument(this.workspace, CONTROL_PLANE_DOCUMENT_PATH);
  }

  private async writeControlPlane(document: ControlPlaneDocument): Promise<void> {
    await writeControlPlaneDocument(this.workspace, document, CONTROL_PLANE_DOCUMENT_PATH);
  }

  private async updateControlPlaneDocument<T>(
    updater: (document: ControlPlaneDocument) => T | Promise<T>
  ): Promise<T> {
    const document = await this.readControlPlane();
    const result = await updater(document);
    await this.writeControlPlane(document);
    return result;
  }

  getModel() {
    const config = getAssistantConfigValue(this.getConfig());
    return getDefaultModel(this.workerEnv, config.model);
  }

  override getSystemPrompt() {
    return buildAssistantSystemPrompt(this.getConfig());
  }

  override configureSession(session: Session) {
    return configureAssistantSession(session, this.getConfig());
  }

  override getTools(): ToolSet {
    const enabledTools = this.getEnabledToolIds();
    const allTools = this.getAllTools();

    if (enabledTools === undefined) {
      return allTools;
    }

    return Object.fromEntries(
      Object.entries(allTools).filter(([toolId]) => enabledTools.includes(toolId))
    );
  }

  @callable()
  getAssistantConfig(): AssistantConfig {
    return getAssistantConfigValue(this.getConfig());
  }

  @callable()
  getIntegrationSurfaces() {
    return {
      extensions: this.extensionRegistry.getExposure(this.getEnabledExtensionIds()),
      mcp: this.mcpState.getSurface()
    };
  }

  @callable()
  getIntegrationDiagnostics() {
    return {
      extensions: this.extensionRegistry.getDiagnostics(this.getEnabledExtensionIds()),
      mcp: this.mcpState.getDiagnostics()
    };
  }

  @callable()
  async updateAssistantConfig(update: Partial<AssistantConfig>): Promise<AssistantConfig> {
    const previousConfig = this.getAssistantConfig();
    const nextConfig = normalizeAssistantConfig({
      ...previousConfig,
      ...update
    });

    this.configure(nextConfig);

    try {
      await this.session.refreshSystemPrompt();
      return nextConfig;
    } catch (error) {
      this.configure(previousConfig);
      throw error;
    }
  }

  @callable()
  async getControlPlaneSnapshot() {
    const document = await this.readControlPlane();

    return {
      path: CONTROL_PLANE_DOCUMENT_PATH,
      currentSessionId: this.getCurrentSessionId(),
      document,
      toolCatalog: this.getToolCatalog(),
      extensionCatalog: this.getExtensionCatalog(),
      assistantConfig: this.getAssistantConfig()
    };
  }

  @callable()
  async createSessionRecord(input: SessionRecordInput): Promise<ControlPlaneSessionRecord> {
    return this.updateControlPlaneDocument((document) => {
      const now = new Date().toISOString();
      const nextRecord: ControlPlaneSessionRecord = {
        id: input.id,
        title: input.title?.trim() || undefined,
        profileId: input.profileId?.trim() || undefined,
        createdAt: now,
        updatedAt: now
      };

      document.sessions = document.sessions.filter((record) => record.id !== nextRecord.id);
      document.sessions.push(nextRecord);
      document.sessions.sort((left, right) => left.id.localeCompare(right.id));
      return nextRecord;
    });
  }

  @callable()
  async updateSessionRecord(input: SessionRecordInput): Promise<ControlPlaneSessionRecord | null> {
    return this.updateControlPlaneDocument((document) => {
      const index = document.sessions.findIndex((record) => record.id === input.id);
      if (index < 0) {
        return null;
      }

      const existing = document.sessions[index];
      const nextRecord: ControlPlaneSessionRecord = {
        ...existing,
        title: input.title?.trim() || undefined,
        profileId: input.profileId?.trim() || undefined,
        updatedAt: new Date().toISOString()
      };

      document.sessions[index] = nextRecord;
      return nextRecord;
    });
  }

  @callable()
  async deleteSessionRecord(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.updateControlPlaneDocument((document) => {
      const previousLength = document.sessions.length;
      document.sessions = document.sessions.filter((record) => record.id !== id);
      return {
        deleted: document.sessions.length !== previousLength,
        id
      };
    });
  }

  @callable()
  async listAgentProfiles(): Promise<ControlPlaneAgentProfile[]> {
    const document = await this.readControlPlane();
    return document.profiles;
  }

  @callable()
  async createAgentProfile(input: AgentProfileInput): Promise<ControlPlaneAgentProfile> {
    return this.updateControlPlaneDocument((document) => {
      const now = new Date().toISOString();
      const nextProfile: ControlPlaneAgentProfile = {
        id: input.id,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        config: normalizeAssistantConfig(input.config),
        createdAt: now,
        updatedAt: now
      };

      document.profiles = document.profiles.filter((profile) => profile.id !== nextProfile.id);
      document.profiles.push(nextProfile);
      document.profiles.sort((left, right) => left.id.localeCompare(right.id));
      return nextProfile;
    });
  }

  @callable()
  async updateAgentProfile(input: AgentProfileInput): Promise<ControlPlaneAgentProfile | null> {
    return this.updateControlPlaneDocument((document) => {
      const index = document.profiles.findIndex((profile) => profile.id === input.id);
      if (index < 0) {
        return null;
      }

      const existing = document.profiles[index];
      const nextProfile: ControlPlaneAgentProfile = {
        ...existing,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        config: normalizeAssistantConfig({
          ...existing.config,
          ...input.config
        }),
        updatedAt: new Date().toISOString()
      };

      document.profiles[index] = nextProfile;
      return nextProfile;
    });
  }

  @callable()
  async deleteAgentProfile(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.updateControlPlaneDocument((document) => {
      const previousLength = document.profiles.length;
      document.profiles = document.profiles.filter((profile) => profile.id !== id);
      document.sessions = document.sessions.map((session) =>
        session.profileId === id
          ? { ...session, profileId: undefined, updatedAt: new Date().toISOString() }
          : session
      );

      return {
        deleted: document.profiles.length !== previousLength,
        id
      };
    });
  }

  @callable()
  getToolCatalog() {
    const tools = this.getToolCatalogEntries();
    return {
      count: tools.length,
      enabledCount: tools.filter((tool) => tool.enabled).length,
      tools
    };
  }

  @callable()
  async updateEnabledTools(enabledTools: string[]): Promise<AssistantConfig> {
    return this.updateAssistantConfig({ enabledTools });
  }

  @callable()
  getExtensionCatalog() {
    return this.extensionRegistry.getCatalog(this.getEnabledExtensionIds());
  }

  @callable()
  async updateEnabledExtensions(enabledExtensions: string[]): Promise<AssistantConfig> {
    return this.updateAssistantConfig({ enabledExtensions });
  }

  @callable()
  async clearSessionHistory(): Promise<{ requestId: string; status: "completed" | "skipped" }> {
    this.clearMessages();
    return {
      requestId: crypto.randomUUID(),
      status: "completed"
    };
  }

  @callable()
  async saveSyntheticMessage(message: UIMessage): Promise<{ requestId: string; status: "completed" | "skipped" }> {
    return this.saveMessages((currentMessages) => [...currentMessages, message]);
  }

  @callable()
  async continueLastTurn(body?: Record<string, unknown>) {
    return super.continueLastTurn(body);
  }
}
