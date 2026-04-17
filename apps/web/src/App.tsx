import { useEffect, useMemo, useState } from "react";

import { ApprovalsPanel } from "./components/ApprovalsPanel";
import { ChatShell } from "./components/ChatShell";
import { ConfigPanel } from "./components/ConfigPanel";
import { EventLog } from "./components/EventLog";
import { resolveAgentHost, useAssistantUiState } from "./lib/agent";
import { useClientToolRegistry } from "./lib/clientTools";
import { FeatureLab, type FeatureLabRoute, labRoutes } from "./routes/FeatureLab";

const DEFAULT_VIEW = "console" as const;
const DEFAULT_LAB = labRoutes[0].id;
const DEFAULT_SESSION_ID = "main";
const SESSION_STORAGE_KEY = "think-all-in-one.sessions";
const ACTIVE_SESSION_STORAGE_KEY = "think-all-in-one.active-session";

type ViewMode = typeof DEFAULT_VIEW | "lab";
type SessionItem = {
  id: string;
  title: string;
  createdAt: string;
};

export default function App() {
  const [sessions, setSessions] = useState<SessionItem[]>(readStoredSessions);
  const [activeSessionId, setActiveSessionId] = useState(readStoredActiveSessionId);
  const [view, setView] = useState<ViewMode>(getViewFromHash());
  const [activeLab, setActiveLab] = useState<FeatureLabRoute>(getLabFromHash());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    const onHashChange = () => {
      setView(getViewFromHash());
      setActiveLab(getLabFromHash());
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigateToConsole = () => {
    window.location.hash = "#console";
  };

  const navigateToLab = (lab: FeatureLabRoute) => {
    window.location.hash = `#lab/${lab}`;
  };

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  );

  useEffect(() => {
    if (!sessions.some((item) => item.id === activeSessionId) && sessions[0]) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  const handleCreateSession = () => {
    const next = createSession();
    setSessions((current) => [next, ...current]);
    setActiveSessionId(next.id);
    navigateToConsole();
  };

  return (
    <main style={pageStyle}>
      <div style={workspaceShellStyle}>
        <aside style={sidebarStyle}>
          <div style={sidebarHeaderStyle}>
            <div>
              <h2 style={sidebarTitleStyle}>Chats</h2>
              <p style={sidebarCopyStyle}>{sessions.length} active session{sessions.length === 1 ? "" : "s"}</p>
            </div>
            <button type="button" style={newChatButtonStyle} onClick={handleCreateSession}>
              New chat
            </button>
          </div>

          <div style={sessionListStyle}>
            {sessions.map((item) => (
              <button
                key={item.id}
                type="button"
                style={item.id === activeSessionId ? activeSessionButtonStyle : sessionButtonStyle}
                onClick={() => {
                  setActiveSessionId(item.id);
                  navigateToConsole();
                }}
              >
                <strong style={sessionTitleStyle}>{item.title}</strong>
                <span style={sessionMetaStyle}>{item.id}</span>
              </button>
            ))}
          </div>
        </aside>

        <SessionWorkspace
          key={activeSessionId}
          session={activeSession ?? createSession(DEFAULT_SESSION_ID, "Main chat")}
          view={view}
          activeLab={activeLab}
          onNavigateConsole={navigateToConsole}
          onNavigateLab={navigateToLab}
          onRenameSession={(title) => {
            setSessions((current) =>
              current.map((item) => (item.id === activeSessionId ? { ...item, title } : item))
            );
          }}
        />
      </div>
    </main>
  );
}

function SessionWorkspace({
  session,
  view,
  activeLab,
  onNavigateConsole,
  onNavigateLab,
  onRenameSession
}: {
  session: SessionItem;
  view: ViewMode;
  activeLab: FeatureLabRoute;
  onNavigateConsole: () => void;
  onNavigateLab: (lab: FeatureLabRoute) => void;
  onRenameSession: (title: string) => void;
}) {
  const {
    chat,
    approvals,
    config,
    events,
    summary,
    submitMessage,
    updateConfig,
    applyConfig,
    resolveApproval,
    clearHistory,
    sessionId
  } = useAssistantUiState(session.id);
  const { entries: clientTools, rerunTool, rerunAll } = useClientToolRegistry();

  const handleSendMessage = async (text: string) => {
    await submitMessage(text);
    if (shouldRenameSession(session.title)) {
      onRenameSession(buildSessionTitle(text));
    }
  };

  return (
    <div style={mainContentStyle}>
      <header style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>think-all-in-one</p>
          <h1 style={headingStyle}>Main assistant workspace</h1>
          <p style={subheadingStyle}>
            A usable multi-chat client for MainAssistantAgent. Start a new chat, switch sessions,
            talk to the agent, inspect config, and keep an event trail for the active thread.
          </p>
        </div>
        <dl style={summaryGridStyle}>
          <SummaryCard label="Messages" value={String(summary.messageCount)} />
          <SummaryCard label="Connection" value={summary.connectionState} />
          <SummaryCard label="Pending approvals" value={String(summary.pendingApprovals)} />
        </dl>
      </header>

      <nav aria-label="Main navigation" style={topNavStyle}>
        <button
          type="button"
          style={view === "console" ? activeTabStyle : tabStyle}
          onClick={onNavigateConsole}
        >
          Console
        </button>
        <button
          type="button"
          style={view === "lab" ? activeTabStyle : tabStyle}
          onClick={() => onNavigateLab(activeLab)}
        >
          Feature Lab
        </button>
      </nav>

      {view === "console" ? (
        <section style={contentStyle}>
          <div style={primaryColumnStyle}>
            <div style={activeSessionBarStyle}>
              <div>
                <div style={activeSessionLabelStyle}>Active session</div>
                <strong>{session.title}</strong>
                <div style={activeSessionMetaStyle}>{sessionId}</div>
              </div>
              <button type="button" style={secondaryActionStyle} onClick={() => clearHistory()}>
                Clear chat
              </button>
            </div>

            <ChatShell
              messages={chat.messages}
              status={chat.status}
              onSendMessage={handleSendMessage}
            />
          </div>
          <div style={secondaryColumnStyle}>
            <ApprovalsPanel approvals={approvals} onResolve={resolveApproval} />
            <ConfigPanel config={config} onChange={updateConfig} onApply={applyConfig} />
            <EventLog events={events} />
          </div>
        </section>
      ) : (
        <FeatureLab
          activeLab={activeLab}
          onNavigate={onNavigateLab}
          summary={summary}
          messageCount={chat.messages.length}
          approvals={approvals}
          config={config}
          events={events}
          clientTools={clientTools}
          onRunClientTool={(id) => {
            void rerunTool(id);
          }}
          onRunAllClientTools={() => {
            void rerunAll();
          }}
          agentHost={resolveAgentHost()}
          sessionId={sessionId}
        />
      )}
    </div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div style={summaryCardStyle}>
      <dt style={summaryLabelStyle}>{label}</dt>
      <dd style={summaryValueStyle}>{value}</dd>
    </div>
  );
}

function getViewFromHash(): ViewMode {
  if (typeof window === "undefined") {
    return DEFAULT_VIEW;
  }

  return window.location.hash.startsWith("#lab/") ? "lab" : DEFAULT_VIEW;
}

function getLabFromHash(): FeatureLabRoute {
  if (typeof window === "undefined") {
    return DEFAULT_LAB;
  }

  const match = window.location.hash.match(/^#lab\/(.+)$/);
  const requested = match?.[1];

  return labRoutes.some((route) => route.id === requested)
    ? (requested as FeatureLabRoute)
    : DEFAULT_LAB;
}

function readStoredSessions(): SessionItem[] {
  if (typeof window === "undefined") {
    return [createSession(DEFAULT_SESSION_ID, "Main chat")];
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return [createSession(DEFAULT_SESSION_ID, "Main chat")];
  }

  try {
    const parsed = JSON.parse(raw) as SessionItem[];
    return parsed.length > 0 ? parsed : [createSession(DEFAULT_SESSION_ID, "Main chat")];
  } catch {
    return [createSession(DEFAULT_SESSION_ID, "Main chat")];
  }
}

function readStoredActiveSessionId() {
  if (typeof window === "undefined") {
    return DEFAULT_SESSION_ID;
  }

  return window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) ?? DEFAULT_SESSION_ID;
}

function createSession(id = `chat-${crypto.randomUUID().slice(0, 8)}`, title = "New chat"): SessionItem {
  return {
    id,
    title,
    createdAt: new Date().toISOString()
  };
}

function shouldRenameSession(title: string) {
  return title === "New chat" || title === "Main chat";
}

function buildSessionTitle(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length > 36 ? `${normalized.slice(0, 36)}…` : normalized;
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f3f4f6",
  color: "#111827",
  padding: 24,
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
} as const;

const heroStyle = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: 16,
  marginBottom: 16,
  alignItems: "start"
} as const;

const eyebrowStyle = { margin: 0, textTransform: "uppercase", color: "#57606a", letterSpacing: "0.08em" } as const;
const headingStyle = { margin: "8px 0", fontSize: "2rem" } as const;
const subheadingStyle = { margin: 0, color: "#57606a", maxWidth: 720 } as const;
const summaryGridStyle = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: 0 } as const;
const summaryCardStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16, margin: 0 } as const;
const summaryLabelStyle = { color: "#57606a", marginBottom: 6 } as const;
const summaryValueStyle = { margin: 0, fontWeight: 700, fontSize: "1.25rem" } as const;
const topNavStyle = { display: "flex", gap: 8, marginBottom: 16 } as const;
const tabStyle = { border: "1px solid #d0d7de", background: "#fff", color: "#111827", borderRadius: 999, padding: "8px 14px", cursor: "pointer" } as const;
const activeTabStyle = { ...tabStyle, background: "#111827", color: "#fff", border: "1px solid #111827" } as const;
const workspaceShellStyle = { display: "grid", gridTemplateColumns: "280px minmax(0, 1fr)", gap: 16, alignItems: "start" } as const;
const sidebarStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16, display: "grid", gap: 16, position: "sticky", top: 24 } as const;
const sidebarHeaderStyle = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" } as const;
const sidebarTitleStyle = { margin: 0 } as const;
const sidebarCopyStyle = { margin: "4px 0 0", color: "#57606a", fontSize: 13 } as const;
const newChatButtonStyle = { border: "none", borderRadius: 999, padding: "8px 12px", background: "#1f6feb", color: "#fff", cursor: "pointer", whiteSpace: "nowrap" } as const;
const sessionListStyle = { display: "grid", gap: 8 } as const;
const sessionButtonStyle = { textAlign: "left", border: "1px solid #d0d7de", background: "#f8fafc", borderRadius: 10, padding: 12, cursor: "pointer", display: "grid", gap: 4 } as const;
const activeSessionButtonStyle = { ...sessionButtonStyle, background: "#111827", color: "#fff", border: "1px solid #111827" } as const;
const sessionTitleStyle = { fontSize: 14 } as const;
const sessionMetaStyle = { fontSize: 12, opacity: 0.75 } as const;
const mainContentStyle = { minWidth: 0 } as const;
const contentStyle = { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" } as const;
const primaryColumnStyle = { display: "grid", gap: 12 } as const;
const secondaryColumnStyle = { display: "grid", gap: 16 } as const;
const activeSessionBarStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const activeSessionLabelStyle = { color: "#57606a", fontSize: 12, marginBottom: 4 } as const;
const activeSessionMetaStyle = { color: "#57606a", fontSize: 12, marginTop: 4 } as const;
const secondaryActionStyle = { border: "1px solid #d0d7de", background: "#fff", borderRadius: 999, padding: "8px 12px", cursor: "pointer" } as const;
