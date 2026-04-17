/// <reference types="@cloudflare/workers-types" />

import { Think, type Session } from "@cloudflare/think";
import type { ToolSet, UIMessage } from "ai";
import type { WorkspaceOptions } from "@cloudflare/shell";

import type { Env } from "../index.js";
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
import type { AssistantConfig } from "../types/config.js";
import { createWorkspace } from "../workspace/createWorkspace.js";

const MAIN_ASSISTANT_PROTECTED_PATHS: ProtectedPathRule[] = [
  { path: "/", reason: "Deleting the workspace root is always destructive and must be approved." },
  { path: "/system", reason: "System-managed state and assistant metadata." },
  { path: "/notes", reason: "Durable assistant notes should not be deleted casually." },
  { path: "/config", reason: "Configuration files may affect future assistant behavior." },
  { path: "/agents", reason: "Agent scaffolding and coordination artifacts." }
];

export class MainAssistantAgent extends Think<Env, AssistantConfig> {
  declare readonly env: Env;
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

  getModel() {
    const config = getAssistantConfigValue(this.getConfig());
    return getDefaultModel(this.env, config.model);
  }

  override getSystemPrompt() {
    return buildAssistantSystemPrompt(this.getConfig());
  }

  override configureSession(session: Session) {
    return configureAssistantSession(session, this.getConfig());
  }

  override getTools(): ToolSet {
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

  getAssistantConfig(): AssistantConfig {
    return getAssistantConfigValue(this.getConfig());
  }

  getIntegrationSurfaces() {
    return {
      extensions: this.extensionRegistry.getExposure(),
      mcp: this.mcpState.getSurface()
    };
  }

  getIntegrationDiagnostics() {
    return {
      extensions: this.extensionRegistry.getDiagnostics(),
      mcp: this.mcpState.getDiagnostics()
    };
  }

  async updateAssistantConfig(update: Partial<AssistantConfig>): Promise<AssistantConfig> {
    const previousConfig = this.getAssistantConfig();
    const nextConfig = {
      ...previousConfig,
      ...update
    };

    this.configure(nextConfig);

    try {
      await this.session.refreshSystemPrompt();
      return nextConfig;
    } catch (error) {
      this.configure(previousConfig);
      throw error;
    }
  }

  async saveSyntheticMessage(message: UIMessage): Promise<{ requestId: string; status: "completed" | "skipped" }> {
    return this.saveMessages((currentMessages) => [...currentMessages, message]);
  }

  async continueLastTurn(body?: Record<string, unknown>) {
    return super.continueLastTurn(body);
  }
}
