import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";

import type { AssistantConfig } from "../../types/config.js";
import { resolveProtectedPaths, type ProtectedPathRule } from "./protectedFiles.js";

export interface DiagnosticsWorkspace {
  getWorkspaceInfo(): Promise<{
    fileCount: number;
    directoryCount: number;
    totalBytes: number;
    r2FileCount: number;
  }>;
  _getAllPaths?(): Promise<string[]>;
}

export interface DiagnosticsToolOptions {
  workspace: DiagnosticsWorkspace;
  getConfig?: () => AssistantConfig;
  protectedPaths?: readonly (string | ProtectedPathRule)[];
  getSurfaces?: () => Record<string, unknown>;
  getDiagnostics?: () => Record<string, unknown>;
}

export function createDiagnosticsTool(options: DiagnosticsToolOptions) {
  const protectedPaths = resolveProtectedPaths(options.protectedPaths);

  return tool({
    description:
      "Return server-side diagnostics for the assistant, including workspace usage, protected paths, current assistant configuration, and exposed integration surfaces.",
    inputSchema: z.object({
      includePaths: z.boolean().optional().default(false)
    }),
    execute: async (input, _context?: ToolExecutionOptions) => {
      const workspaceInfo = await options.workspace.getWorkspaceInfo();
      const paths = input.includePaths && options.workspace._getAllPaths
        ? await options.workspace._getAllPaths()
        : undefined;

      return {
        ok: true,
        workspace: workspaceInfo,
        config: options.getConfig?.() ?? {},
        protectedPaths,
        surfaces: options.getSurfaces?.() ?? {},
        diagnostics: options.getDiagnostics?.() ?? {},
        paths
      };
    }
  });
}
