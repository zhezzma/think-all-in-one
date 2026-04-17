import { describe, expect, it, vi } from "vitest";

vi.mock("@cloudflare/shell", () => ({
  Workspace: class Workspace {
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
  }
}));

import {
  createNotesTool,
  readNotesDocument
} from "../src/tools/server/notes.js";
import { createDiagnosticsTool } from "../src/tools/server/diagnostics.js";
import {
  createProtectedDeleteTool,
  matchProtectedPath,
  normalizeWorkspacePath,
  resolveProtectedPaths
} from "../src/tools/server/protectedFiles.js";
import { createWorkspace } from "../src/workspace/createWorkspace.js";

describe("protected delete tool", () => {
  it("requests approval for protected paths and normalizes deletes", async () => {
    const workspace = {
      rm: vi.fn(async () => undefined)
    };
    const tool = createProtectedDeleteTool({
      workspace,
      protectedPaths: [
        "/system",
        { path: "/notes", reason: "Contains assistant-authored notes." }
      ]
    });

    expect(typeof tool.needsApproval).toBe("function");

    if (typeof tool.needsApproval !== "function") {
      throw new Error("protected delete tool should expose a functional needsApproval hook");
    }

    await expect(
      tool.needsApproval(
        { path: "system/secrets.json", recursive: true, force: false },
        { toolCallId: "call-1", messages: [], experimental_context: undefined }
      )
    ).resolves.toBe(true);

    await expect(
      tool.needsApproval(
        { path: "/tmp/output.txt", recursive: false, force: false },
        { toolCallId: "call-2", messages: [], experimental_context: undefined }
      )
    ).resolves.toBe(false);

    const result = await tool.execute?.(
      { path: "notes/today.md", recursive: false, force: true },
      { toolCallId: "call-3", messages: [] }
    );

    expect(workspace.rm).toHaveBeenCalledWith("/notes/today.md", {
      recursive: false,
      force: true
    });
    expect(result).toMatchObject({
      deleted: "/notes/today.md",
      requiredApproval: true,
      protectedPath: "/notes"
    });
  });

  it("matches protected prefixes predictably", () => {
    expect(normalizeWorkspacePath("notes/todo.txt")).toBe("/notes/todo.txt");
    expect(matchProtectedPath("/notes/todo.txt", ["/notes"]))?.toEqual({ path: "/notes" });
    expect(matchProtectedPath("/tmp/todo.txt", ["/notes"]))?.toBeNull();
  });

  it("treats the workspace root as a protected path when configured", () => {
    const rules = resolveProtectedPaths([
      { path: "/", reason: "root" },
      "/notes"
    ]);

    expect(matchProtectedPath("/", rules)).toEqual({ path: "/", reason: "root" });
    expect(matchProtectedPath("/notes/today.md", rules)).toEqual({ path: "/notes" });
  });
});

describe("notes tool", () => {
  it("persists, lists, gets, and deletes notes", async () => {
    const store = new Map<string, string>();
    const workspace = {
      readFile: vi.fn(async (path: string) => store.get(path) ?? null),
      writeFile: vi.fn(async (path: string, content: string) => {
        store.set(path, content);
      })
    };
    const tool = createNotesTool({ workspace, path: "/system/test-notes.json" });

    const saveResult = await tool.execute?.(
      { action: "set", key: "user-preference", content: "Prefers concise answers", tags: ["user", "prefs", "user"] },
      { toolCallId: "note-1", messages: [] }
    );
    expect(saveResult).toMatchObject({
      saved: true,
      replaced: false,
      note: {
        key: "user-preference",
        content: "Prefers concise answers",
        tags: ["prefs", "user"]
      }
    });

    const listResult = await tool.execute?.(
      { action: "list" },
      { toolCallId: "note-2", messages: [] }
    );
    expect(listResult).toMatchObject({ count: 1 });

    const getResult = await tool.execute?.(
      { action: "get", key: "user-preference" },
      { toolCallId: "note-3", messages: [] }
    );
    expect(getResult).toMatchObject({
      found: true,
      note: {
        key: "user-preference",
        content: "Prefers concise answers"
      }
    });

    const deleteResult = await tool.execute?.(
      { action: "delete", key: "user-preference" },
      { toolCallId: "note-4", messages: [] }
    );
    expect(deleteResult).toMatchObject({ deleted: true, key: "user-preference" });

    await expect(readNotesDocument(workspace, "/system/test-notes.json")).resolves.toEqual({
      notes: []
    });
  });

  it("returns a validation-style error when setting without content", async () => {
    const workspace = {
      readFile: vi.fn(async () => null),
      writeFile: vi.fn(async () => undefined)
    };
    const tool = createNotesTool({ workspace });

    const result = await tool.execute?.(
      { action: "set", key: "empty" },
      { toolCallId: "note-5", messages: [] }
    );

    expect(result).toMatchObject({
      error: "content is required when setting a note."
    });
    expect(workspace.writeFile).not.toHaveBeenCalled();
  });

  it("treats malformed persisted notes as an empty document", async () => {
    const workspace = {
      readFile: vi.fn(async () => "{not-json"),
      writeFile: vi.fn(async () => undefined)
    };

    await expect(readNotesDocument(workspace)).resolves.toEqual({ notes: [] });
  });
});

describe("diagnostics tool", () => {
  it("returns workspace info, config, protected paths, and optional paths", async () => {
    const workspace = {
      getWorkspaceInfo: vi.fn(async () => ({
        fileCount: 3,
        directoryCount: 2,
        totalBytes: 512,
        r2FileCount: 1
      })),
      _getAllPaths: vi.fn(async () => ["/notes/today.md", "/system/state.json"])
    };
    const tool = createDiagnosticsTool({
      workspace,
      getConfig: () => ({ model: "test-model" }),
      protectedPaths: [{ path: "/", reason: "root" }, "/notes"]
    });

    const result = await tool.execute?.(
      { includePaths: true },
      { toolCallId: "diag-1", messages: [] }
    );

    expect(result).toEqual({
      ok: true,
      workspace: {
        fileCount: 3,
        directoryCount: 2,
        totalBytes: 512,
        r2FileCount: 1
      },
      config: { model: "test-model" },
      protectedPaths: [{ path: "/", reason: "root" }, { path: "/notes" }],
      surfaces: {},
      diagnostics: {},
      paths: ["/notes/today.md", "/system/state.json"]
    });
  });
});

describe("workspace factory", () => {
  it("passes optional R2 spillover options through to Workspace", () => {
    const sql = { exec: vi.fn() };
    const r2 = { put: vi.fn(), get: vi.fn(), delete: vi.fn() };

    const workspace = createWorkspace({
      sql: sql as never,
      name: () => "assistant",
      r2: r2 as never,
      r2Prefix: "lab/",
      inlineThreshold: 1024,
      namespace: "think",
      onChange: vi.fn()
    }) as unknown as { options: Record<string, unknown> };

    expect(workspace.options).toMatchObject({
      sql,
      r2,
      r2Prefix: "lab/",
      inlineThreshold: 1024,
      namespace: "think"
    });
  });
});
