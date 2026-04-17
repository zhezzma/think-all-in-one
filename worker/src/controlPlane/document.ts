export const CONTROL_PLANE_DOCUMENT_VERSION = 1;

export const CONTROL_PLANE_DOCUMENT_PATH = "/system/control-plane.json";

export interface ControlPlaneSessionRecord {
  id: string;
  title?: string;
  profileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneAgentProfile {
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
  };
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneDocument {
  version: number;
  sessions: ControlPlaneSessionRecord[];
  profiles: ControlPlaneAgentProfile[];
}

function normalizeString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return [...new Set(value.map((entry) => normalizeString(entry)).filter((entry): entry is string => !!entry))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeTimestamp(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : new Date(0).toISOString();
}

export function normalizeControlPlaneSessionRecord(
  record: Partial<ControlPlaneSessionRecord> | null | undefined
): ControlPlaneSessionRecord | null {
  const id = normalizeString(record?.id);
  if (!id) {
    return null;
  }

  return {
    id,
    title: normalizeString(record?.title),
    profileId: normalizeString(record?.profileId),
    createdAt: normalizeTimestamp(record?.createdAt),
    updatedAt: normalizeTimestamp(record?.updatedAt)
  };
}

export function normalizeControlPlaneAgentProfile(
  profile: Partial<ControlPlaneAgentProfile> | null | undefined
): ControlPlaneAgentProfile | null {
  const id = normalizeString(profile?.id);
  const name = normalizeString(profile?.name);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    description: normalizeString(profile?.description),
    config: {
      model: normalizeString(profile?.config?.model),
      systemPrompt: normalizeString(profile?.config?.systemPrompt),
      identity: normalizeString(profile?.config?.identity),
      memoryMaxTokens:
        typeof profile?.config?.memoryMaxTokens === "number"
          ? profile.config.memoryMaxTokens
          : undefined,
      enabledTools: normalizeStringArray(profile?.config?.enabledTools),
      enabledExtensions: normalizeStringArray(profile?.config?.enabledExtensions)
    },
    createdAt: normalizeTimestamp(profile?.createdAt),
    updatedAt: normalizeTimestamp(profile?.updatedAt)
  };
}

export function normalizeControlPlaneDocument(
  document: Partial<ControlPlaneDocument> | null | undefined
): ControlPlaneDocument {
  return {
    version: CONTROL_PLANE_DOCUMENT_VERSION,
    sessions: Array.isArray(document?.sessions)
      ? document.sessions
          .map((record) => normalizeControlPlaneSessionRecord(record))
          .filter((record): record is ControlPlaneSessionRecord => record !== null)
          .sort((left, right) => left.id.localeCompare(right.id))
      : [],
    profiles: Array.isArray(document?.profiles)
      ? document.profiles
          .map((profile) => normalizeControlPlaneAgentProfile(profile))
          .filter((profile): profile is ControlPlaneAgentProfile => profile !== null)
          .sort((left, right) => left.id.localeCompare(right.id))
      : []
  };
}

export interface ControlPlaneWorkspace {
  readFile(path: string): Promise<string | null>;
  writeFile(path: string, content: string): Promise<void>;
}

export async function readControlPlaneDocument(
  workspace: ControlPlaneWorkspace,
  path = CONTROL_PLANE_DOCUMENT_PATH
): Promise<ControlPlaneDocument> {
  const existing = await workspace.readFile(path);
  if (!existing) {
    return normalizeControlPlaneDocument(undefined);
  }

  try {
    return normalizeControlPlaneDocument(JSON.parse(existing) as Partial<ControlPlaneDocument>);
  } catch {
    return normalizeControlPlaneDocument(undefined);
  }
}

export async function writeControlPlaneDocument(
  workspace: ControlPlaneWorkspace,
  document: ControlPlaneDocument,
  path = CONTROL_PLANE_DOCUMENT_PATH
): Promise<void> {
  await workspace.writeFile(path, `${JSON.stringify(normalizeControlPlaneDocument(document), null, 2)}\n`);
}
