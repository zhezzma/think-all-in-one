import type {
  ApprovalItem,
  AgentEvent,
  AssistantConfigDraft,
  ControlPlaneAgentProfile,
  ControlPlaneSessionRecord,
  ExtensionCatalog,
  ToolCatalog
} from "../lib/agent";
import type { ClientToolEntry } from "../lib/clientTools";
import { ClientToolsLab } from "./labs/ClientToolsLab";
import { ExtensionsLab } from "./labs/ExtensionsLab";
import { McpLab } from "./labs/McpLab";
import { SessionLab } from "./labs/SessionLab";
import { SubagentsLab } from "./labs/SubagentsLab";
import { ToolsLab } from "./labs/ToolsLab";
import { WorkspaceLab } from "./labs/WorkspaceLab";

export const labRoutes = [
  { id: "session", label: "Session" },
  { id: "workspace", label: "Workspace" },
  { id: "tools", label: "Tools" },
  { id: "client-tools", label: "Client tools" },
  { id: "subagents", label: "Sub-agents" },
  { id: "mcp", label: "MCP" },
  { id: "extensions", label: "Extensions" }
] as const;

export type FeatureLabRoute = (typeof labRoutes)[number]["id"];

export type FeatureLabProps = {
  activeLab: FeatureLabRoute;
  onNavigate: (route: FeatureLabRoute) => void;
  summary: {
    messageCount: number;
    connectionState: string;
    pendingApprovals: number;
  };
  messageCount: number;
  approvals: ApprovalItem[];
  config: AssistantConfigDraft;
  events: AgentEvent[];
  clientTools: ClientToolEntry[];
  onRunClientTool: (id: string) => void;
  onRunAllClientTools: () => void;
  agentHost: string;
  sessionId: string;
  session: ControlPlaneSessionRecord;
  sessions: ControlPlaneSessionRecord[];
  profiles: ControlPlaneAgentProfile[];
  toolCatalog: ToolCatalog;
  extensionCatalog: ExtensionCatalog;
  onRenameSession: (title: string) => Promise<void>;
  onClearSession: () => Promise<void>;
  onCreateProfile: (input: {
    id: string;
    name: string;
    description?: string;
    config?: { model?: string; systemPrompt?: string; enabledTools?: string[]; enabledExtensions?: string[] };
  }) => Promise<void>;
  onUpdateProfile: (input: {
    id: string;
    name: string;
    description?: string;
    config?: { model?: string; systemPrompt?: string; enabledTools?: string[]; enabledExtensions?: string[] };
  }) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onAssignProfile: (profileId?: string) => Promise<void>;
  onUpdateEnabledTools: (enabledTools: string[]) => Promise<void>;
  onUpdateEnabledExtensions: (enabledExtensions: string[]) => Promise<void>;
};

export function FeatureLab(props: FeatureLabProps) {
  return (
    <section style={shellStyle}>
      <header style={headerStyle}>
        <div>
          <p style={eyebrowStyle}>Feature Lab</p>
          <h1 style={titleStyle}>Integration surfaces and local tools</h1>
          <p style={copyStyle}>
            Focused, inspectable views for session state, workspace metadata, tools, sub-agents,
            MCP, and extensions.
          </p>
        </div>
        <nav aria-label="Feature lab navigation" style={navStyle}>
          {labRoutes.map((route) => (
            <button
              key={route.id}
              type="button"
              style={route.id === props.activeLab ? activeNavButtonStyle : navButtonStyle}
              onClick={() => props.onNavigate(route.id)}
            >
              {route.label}
            </button>
          ))}
        </nav>
      </header>

      {renderLab(props)}
    </section>
  );
}

function renderLab(props: FeatureLabProps) {
  switch (props.activeLab) {
    case "session":
      return (
        <SessionLab
          summary={props.summary}
          messageCount={props.messageCount}
          approvals={props.approvals}
          config={props.config}
          events={props.events}
          sessionId={props.sessionId}
          session={props.session}
          sessions={props.sessions}
          profiles={props.profiles}
          onRenameSession={props.onRenameSession}
          onClearSession={props.onClearSession}
          onCreateProfile={props.onCreateProfile}
          onUpdateProfile={props.onUpdateProfile}
          onDeleteProfile={props.onDeleteProfile}
          onAssignProfile={props.onAssignProfile}
        />
      );
    case "workspace":
      return (
        <WorkspaceLab
          projectName="think-all-in-one"
          agentHost={props.agentHost}
          route={props.activeLab}
        />
      );
    case "tools":
      return (
        <ToolsLab
          toolCatalog={props.toolCatalog}
          onUpdateEnabledTools={props.onUpdateEnabledTools}
        />
      );
    case "client-tools":
      return (
        <ClientToolsLab
          tools={props.clientTools}
          onRunTool={props.onRunClientTool}
          onRunAll={props.onRunAllClientTools}
        />
      );
    case "subagents":
      return <SubagentsLab />;
    case "mcp":
      return <McpLab />;
    case "extensions":
      return (
        <ExtensionsLab
          extensionCatalog={props.extensionCatalog}
          onUpdateEnabledExtensions={props.onUpdateEnabledExtensions}
        />
      );
    default:
      return null;
  }
}

const shellStyle = { display: "grid", gap: 16 } as const;
const headerStyle = { display: "grid", gap: 12 } as const;
const eyebrowStyle = { margin: 0, textTransform: "uppercase", color: "#57606a", letterSpacing: "0.08em" } as const;
const titleStyle = { margin: 0, fontSize: "2rem" } as const;
const copyStyle = { margin: 0, color: "#57606a", maxWidth: 840 } as const;
const navStyle = { display: "flex", gap: 8, flexWrap: "wrap" } as const;
const navButtonStyle = { border: "1px solid #d0d7de", background: "#fff", color: "#111827", borderRadius: 999, padding: "8px 12px", cursor: "pointer" } as const;
const activeNavButtonStyle = { ...navButtonStyle, background: "#1f6feb", borderColor: "#1f6feb", color: "#fff" } as const;
