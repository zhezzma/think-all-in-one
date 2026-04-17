import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";

const DEFAULT_PROTECTED_PATHS = ["/", "/system", "/notes", "/config", "/agents"] as const;

export interface ProtectedPathRule {
  path: string;
  reason?: string;
}

export interface ProtectedDeleteWorkspace {
  rm(
    path: string,
    opts?: {
      recursive?: boolean;
      force?: boolean;
    }
  ): Promise<void>;
}

export interface ProtectedDeleteToolOptions {
  workspace: ProtectedDeleteWorkspace;
  protectedPaths?: readonly (string | ProtectedPathRule)[];
}

export function normalizeWorkspacePath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === ".") {
    return "/";
  }

  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const normalized = prefixed.replace(/\/{2,}/g, "/");

  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }

  return normalized;
}

export function resolveProtectedPaths(
  protectedPaths?: readonly (string | ProtectedPathRule)[]
): ProtectedPathRule[] {
  const source = protectedPaths?.length ? protectedPaths : DEFAULT_PROTECTED_PATHS;

  return source.map((entry) =>
    typeof entry === "string"
      ? { path: normalizeWorkspacePath(entry) }
      : {
          path: normalizeWorkspacePath(entry.path),
          reason: entry.reason
        }
  );
}

export function matchProtectedPath(
  path: string,
  protectedPaths?: readonly (string | ProtectedPathRule)[]
): ProtectedPathRule | null {
  const normalizedPath = normalizeWorkspacePath(path);

  for (const rule of resolveProtectedPaths(protectedPaths)) {
    if (rule.path === "/") {
      if (normalizedPath === "/") {
        return rule;
      }
      continue;
    }

    if (normalizedPath === rule.path || normalizedPath.startsWith(`${rule.path}/`)) {
      return rule;
    }
  }

  return null;
}

export function createProtectedDeleteTool(options: ProtectedDeleteToolOptions) {
  const resolvedProtectedPaths = resolveProtectedPaths(options.protectedPaths);

  return tool({
    description:
      "Delete files or directories from the workspace. Destructive deletes under protected paths require explicit approval.",
    inputSchema: z.object({
      path: z.string().min(1),
      recursive: z.boolean().optional().default(false),
      force: z.boolean().optional().default(false)
    }),
    needsApproval: async (input) => matchProtectedPath(input.path, resolvedProtectedPaths) !== null,
    execute: async (input, _context?: ToolExecutionOptions) => {
      const normalizedPath = normalizeWorkspacePath(input.path);
      const protectedRule = matchProtectedPath(normalizedPath, resolvedProtectedPaths);

      await options.workspace.rm(normalizedPath, {
        recursive: input.recursive,
        force: input.force
      });

      return {
        deleted: normalizedPath,
        recursive: input.recursive ?? false,
        force: input.force ?? false,
        requiredApproval: protectedRule !== null,
        protectedPath: protectedRule?.path,
        reason: protectedRule?.reason
      };
    }
  });
}

export { DEFAULT_PROTECTED_PATHS };
