import { tool, type ToolExecutionOptions } from "ai";
import { z } from "zod";

const DEFAULT_NOTES_PATH = "/system/assistant-notes.json";

export interface NoteRecord {
  key: string;
  content: string;
  updatedAt: string;
  tags?: string[];
}

export interface NotesDocument {
  notes: NoteRecord[];
}

export interface NotesWorkspace {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
}

export interface NotesToolOptions {
  workspace: NotesWorkspace;
  path?: string;
}

function normalizeTags(tags?: string[]): string[] | undefined {
  if (!tags?.length) {
    return undefined;
  }

  const unique = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  return unique.length ? unique : undefined;
}

export async function readNotesDocument(
  workspace: NotesWorkspace,
  path = DEFAULT_NOTES_PATH
): Promise<NotesDocument> {
  const existing = await workspace.readFile(path);
  if (!existing) {
    return { notes: [] };
  }

  let parsed: Partial<NotesDocument>;

  try {
    parsed = JSON.parse(existing) as Partial<NotesDocument>;
  } catch {
    return { notes: [] };
  }

  return {
    notes: Array.isArray(parsed.notes)
      ? parsed.notes
          .filter((note): note is NoteRecord => {
            return !!note && typeof note.key === "string" && typeof note.content === "string";
          })
          .map((note) => ({
            key: note.key,
            content: note.content,
            updatedAt:
              typeof note.updatedAt === "string" && note.updatedAt.length > 0
                ? note.updatedAt
                : new Date(0).toISOString(),
            tags: normalizeTags(note.tags)
          }))
      : []
  };
}

export async function writeNotesDocument(
  workspace: NotesWorkspace,
  document: NotesDocument,
  path = DEFAULT_NOTES_PATH
): Promise<void> {
  await workspace.writeFile(
    path,
    `${JSON.stringify({ notes: document.notes }, null, 2)}\n`
  );
}

export function createNotesTool(options: NotesToolOptions) {
  const path = options.path ?? DEFAULT_NOTES_PATH;

  return tool({
    description:
      "Persist or retrieve durable assistant notes in the workspace. Supports get, set, delete, and list operations.",
    inputSchema: z.object({
      action: z.enum(["get", "set", "delete", "list"]),
      key: z.string().min(1).optional(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional()
    }),
    execute: async (input, _context?: ToolExecutionOptions) => {
      const document = await readNotesDocument(options.workspace, path);

      if (input.action === "list") {
        return {
          action: input.action,
          path,
          count: document.notes.length,
          notes: document.notes
        };
      }

      if (!input.key) {
        return {
          action: input.action,
          path,
          error: "A key is required for get, set, and delete note operations."
        };
      }

      const index = document.notes.findIndex((note) => note.key === input.key);
      const existing = index >= 0 ? document.notes[index] : null;

      if (input.action === "get") {
        return {
          action: input.action,
          path,
          found: existing !== null,
          note: existing
        };
      }

      if (input.action === "delete") {
        if (index >= 0) {
          document.notes.splice(index, 1);
          await writeNotesDocument(options.workspace, document, path);
        }

        return {
          action: input.action,
          path,
          deleted: index >= 0,
          key: input.key
        };
      }

      if (typeof input.content !== "string" || input.content.trim().length === 0) {
        return {
          action: input.action,
          path,
          error: "content is required when setting a note."
        };
      }

      const nextNote: NoteRecord = {
        key: input.key,
        content: input.content,
        updatedAt: new Date().toISOString(),
        tags: normalizeTags(input.tags)
      };

      if (index >= 0) {
        document.notes[index] = nextNote;
      } else {
        document.notes.push(nextNote);
        document.notes.sort((left, right) => left.key.localeCompare(right.key));
      }

      await writeNotesDocument(options.workspace, document, path);

      return {
        action: input.action,
        path,
        saved: true,
        note: nextNote,
        replaced: index >= 0
      };
    }
  });
}

export { DEFAULT_NOTES_PATH };
