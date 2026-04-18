import { useEffect, useMemo, useState } from "react";

import { ApprovalsPanel } from "./components/ApprovalsPanel";
import { ChatShell } from "./components/ChatShell";
import { ConfigPanel } from "./components/ConfigPanel";
import { EventLog } from "./components/EventLog";
import {
  AUTH_TOKEN_STORAGE_KEY,
  clearStoredAuthToken,
  loginWithToken,
  resolveAgentHost,
  setStoredAuthToken,
  useAssistantUiState,
  useControlPlaneState,
  type ControlPlaneAgentProfile,
  type ControlPlaneSessionRecord
} from "./lib/agent";
import { useClientToolRegistry } from "./lib/clientTools";
import { FeatureLab, type FeatureLabRoute, labRoutes } from "./routes/FeatureLab";

const DEFAULT_VIEW = "console" as const;
const DEFAULT_LAB = labRoutes[0].id;
const DEFAULT_SESSION_ID = "main";
const ACTIVE_SESSION_STORAGE_KEY = "think-all-in-one.active-session";

type ViewMode = typeof DEFAULT_VIEW | "lab";

type ProfileMutationInput = {
  id: string;
  name: string;
  description?: string;
  config?: {
    model?: string;
    systemPrompt?: string;
    enabledTools?: string[];
    enabledExtensions?: string[];
  };
};

export default function App() {
  const [authToken, setAuthToken] = useState(readStoredAuthToken);

  if (!authToken) {
    return (
      <LoginScreen
        onLogin={(token) => {
          setStoredAuthToken(token);
          setAuthToken(token);
        }}
      />
    );
  }

  return (
    <AuthenticatedApp
      authToken={authToken}
      onLogout={() => {
        clearStoredAuthToken();
        setAuthToken("");
      }}
    />
  );
}

function AuthenticatedApp({ authToken, onLogout }: { authToken: string; onLogout: () => void }) {
  const controlPlane = useControlPlaneState();
  const sessions = controlPlane.snapshot?.document.sessions ?? [];
  const profiles = controlPlane.snapshot?.document.profiles ?? [];

  const [activeSessionId, setActiveSessionId] = useState(readStoredActiveSessionId);
  const [view, setView] = useState<ViewMode>(getViewFromHash());
  const [activeLab, setActiveLab] = useState<FeatureLabRoute>(getLabFromHash());
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const onHashChange = () => {
      setView(getViewFromHash());
      setActiveLab(getLabFromHash());
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    if (controlPlane.loading || isMutating || sessions.length > 0) {
      return;
    }

    setIsMutating(true);
    void controlPlane
      .createSession({ id: DEFAULT_SESSION_ID, title: "主聊天" })
      .then(() => {
        setActiveSessionId(DEFAULT_SESSION_ID);
      })
      .finally(() => {
        setIsMutating(false);
      });
  }, [controlPlane, isMutating, sessions.length]);

  useEffect(() => {
    if (sessions.length > 0 && !sessions.some((item) => item.id === activeSessionId)) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? sessions[0],
    [activeSessionId, sessions]
  );

  const navigateToConsole = () => {
    window.location.hash = "#console";
  };

  const navigateToLab = (lab: FeatureLabRoute) => {
    window.location.hash = `#lab/${lab}`;
  };

  const runMutation = async (action: () => Promise<unknown>) => {
    setIsMutating(true);
    try {
      await action();
    } finally {
      setIsMutating(false);
    }
  };

  const handleCreateSession = async () => {
    const next = createSessionRecord();
    await runMutation(async () => {
      await controlPlane.createSession(next);
      setActiveSessionId(next.id);
      navigateToConsole();
    });
  };

  const handleRenameSession = async (title: string) => {
    if (!activeSession) return;

    await runMutation(async () => {
      await controlPlane.updateSession({
        id: activeSession.id,
        title,
        profileId: activeSession.profileId
      });
    });
  };

  const handleDeleteSession = async () => {
    if (!activeSession) return;

    await runMutation(async () => {
      await controlPlane.deleteSession(activeSession.id);
    });
  };

  const handleAssignProfile = async (profileId?: string) => {
    if (!activeSession) return;

    await runMutation(async () => {
      await controlPlane.updateSession({
        id: activeSession.id,
        title: activeSession.title,
        profileId
      });
    });
  };

  const handleCreateProfile = async (input: ProfileMutationInput) => {
    await runMutation(async () => {
      await controlPlane.createProfile(input);
    });
  };

  const handleUpdateProfile = async (input: ProfileMutationInput) => {
    await runMutation(async () => {
      await controlPlane.updateProfile(input);
    });
  };

  const handleDeleteProfile = async (id: string) => {
    await runMutation(async () => {
      await controlPlane.deleteProfile(id);
    });
  };

  if (controlPlane.error) {
    return (
      <main style={pageStyle}>
        <section style={statusPanelStyle}>
          <h1 style={headingStyle}>控制面暂不可用</h1>
          <p style={subheadingStyle}>{controlPlane.error}</p>
        </section>
      </main>
    );
  }

  if (!activeSession) {
    return (
      <main style={pageStyle}>
        <section style={statusPanelStyle}>
          <h1 style={headingStyle}>正在加载工作台…</h1>
          <p style={subheadingStyle}>正在准备可持久化的聊天会话。</p>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={workspaceShellStyle}>
        <aside style={sidebarStyle}>
          <div style={sidebarHeaderStyle}>
            <div>
              <h2 style={sidebarTitleStyle}>聊天列表</h2>
              <p style={sidebarCopyStyle}>
                共 {sessions.length} 个会话
              </p>
            </div>
            <button type="button" style={newChatButtonStyle} onClick={() => void handleCreateSession()}>
              新建聊天
            </button>
          </div>

          <div style={authInfoStyle}>
            <div style={authMetaLabelStyle}>当前状态</div>
            <div style={authStatusTextStyle}>已登录</div>
            <button type="button" style={logoutButtonStyle} onClick={onLogout}>
              退出登录
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
                <strong style={sessionTitleStyle}>{item.title || "Untitled chat"}</strong>
                <span style={sessionMetaStyle}>{item.id}</span>
              </button>
            ))}
          </div>
        </aside>

        <SessionWorkspace
          key={activeSessionId}
          session={activeSession}
          sessions={sessions}
          profiles={profiles}
          view={view}
          activeLab={activeLab}
          onNavigateConsole={navigateToConsole}
          onNavigateLab={navigateToLab}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          onCreateProfile={handleCreateProfile}
          onUpdateProfile={handleUpdateProfile}
          onDeleteProfile={handleDeleteProfile}
          onAssignProfile={handleAssignProfile}
        />
      </div>
    </main>
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <main style={pageStyle}>
      <section style={loginShellStyle}>
        <p style={eyebrowStyle}>think-all-in-one</p>
        <h1 style={headingStyle}>登录到 Think 工作台</h1>
        <p style={subheadingStyle}>输入访问令牌后，才允许进入主界面并发起所有 agent / chat API 请求。</p>

        <form
          style={loginFormStyle}
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            setError("");

            try {
              await loginWithToken(token);
              onLogin(token);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "登录失败，请重试。");
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <label style={loginLabelStyle}>
            <span>访问令牌</span>
            <input
              aria-label="访问令牌"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              style={loginInputStyle}
              placeholder="请输入访问令牌"
            />
          </label>
          {error ? <p style={loginErrorStyle}>{error}</p> : null}
          <button type="submit" style={loginButtonStyle} disabled={submitting}>
            {submitting ? "登录中…" : "登录"}
          </button>
        </form>
      </section>
    </main>
  );
}

function SessionWorkspace({
  session,
  sessions,
  profiles,
  view,
  activeLab,
  onNavigateConsole,
  onNavigateLab,
  onRenameSession,
  onDeleteSession,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onAssignProfile
}: {
  session: ControlPlaneSessionRecord;
  sessions: ControlPlaneSessionRecord[];
  profiles: ControlPlaneAgentProfile[];
  view: ViewMode;
  activeLab: FeatureLabRoute;
  onNavigateConsole: () => void;
  onNavigateLab: (lab: FeatureLabRoute) => void;
  onRenameSession: (title: string) => Promise<void>;
  onDeleteSession: () => Promise<void>;
  onCreateProfile: (input: ProfileMutationInput) => Promise<void>;
  onUpdateProfile: (input: ProfileMutationInput) => Promise<void>;
  onDeleteProfile: (id: string) => Promise<void>;
  onAssignProfile: (profileId?: string) => Promise<void>;
}) {
  const {
    chat,
    approvals,
    config,
    toolCatalog,
    extensionCatalog,
    events,
    summary,
    submitMessage,
    updateConfig,
    applyConfig,
    updateEnabledTools,
    updateEnabledExtensions,
    syncAssistantConfig,
    resolveApproval,
    clearHistory,
    sessionId
  } = useAssistantUiState(session.id);
  const { entries: clientTools, rerunTool, rerunAll } = useClientToolRegistry();

  const handleSendMessage = async (text: string) => {
    await submitMessage(text);
    if (shouldRenameSession(session.title)) {
      await onRenameSession(buildSessionTitle(text));
    }
  };

  const handleAssignProfile = async (profileId?: string) => {
    await onAssignProfile(profileId);

    if (!profileId) {
      await syncAssistantConfig({ profileId: undefined });
      return;
    }

    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      return;
    }

    await syncAssistantConfig({
      profileId,
      ...profile.config
    });
  };

  const handleDeleteActiveSession = async () => {
    await clearHistory();
    await onDeleteSession();
  };

  return (
    <div style={mainContentStyle}>
      <header style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>think-all-in-one</p>
          <h1 style={headingStyle}>主助手工作台</h1>
          <p style={subheadingStyle}>
            一个真正可用的多会话助手客户端。你可以新建聊天、切换会话、和 agent 对话、查看配置，并追踪当前会话的事件记录。
          </p>
        </div>
        <dl style={summaryGridStyle}>
          <SummaryCard label="消息数" value={String(summary.messageCount)} />
          <SummaryCard label="连接状态" value={summary.connectionState} />
          <SummaryCard label="待审批" value={String(summary.pendingApprovals)} />
        </dl>
      </header>

      <nav aria-label="Main navigation" style={topNavStyle}>
        <button
          type="button"
          style={view === "console" ? activeTabStyle : tabStyle}
          onClick={onNavigateConsole}
        >
          控制台
        </button>
        <button
          type="button"
          style={view === "lab" ? activeTabStyle : tabStyle}
          onClick={() => onNavigateLab(activeLab)}
        >
          功能实验室
        </button>
      </nav>

      {view === "console" ? (
        <section style={contentStyle}>
          <div style={primaryColumnStyle}>
            <div style={activeSessionBarStyle}>
              <div>
                <div style={activeSessionLabelStyle}>当前会话</div>
                <strong>{session.title || "Untitled chat"}</strong>
                <div style={activeSessionMetaStyle}>{sessionId}</div>
              </div>
              <div style={inlineActionsStyle}>
                <button type="button" style={secondaryActionStyle} onClick={() => void clearHistory()}>
                  清空聊天
                </button>
                <button type="button" style={dangerActionStyle} onClick={() => void handleDeleteActiveSession()}>
                  删除聊天
                </button>
              </div>
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
          session={session}
          sessions={sessions}
          profiles={profiles}
          toolCatalog={toolCatalog}
          extensionCatalog={extensionCatalog}
          onRenameSession={onRenameSession}
          onClearSession={clearHistory}
          onCreateProfile={onCreateProfile}
          onUpdateProfile={onUpdateProfile}
          onDeleteProfile={onDeleteProfile}
          onAssignProfile={handleAssignProfile}
          onUpdateEnabledTools={updateEnabledTools}
          onUpdateEnabledExtensions={updateEnabledExtensions}
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

function readStoredAuthToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ?? "";
}

function readStoredActiveSessionId() {
  if (typeof window === "undefined") {
    return DEFAULT_SESSION_ID;
  }

  return window.localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY) ?? DEFAULT_SESSION_ID;
}

function createSessionRecord(
  id = `chat-${crypto.randomUUID().slice(0, 8)}`,
  title = "新聊天"
): ControlPlaneSessionRecord {
  const timestamp = new Date().toISOString();
  return {
    id,
    title,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function shouldRenameSession(title?: string) {
  return !title || title === "新聊天" || title === "主聊天" || title === "Main chat";
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

const statusPanelStyle = {
  background: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 24
} as const;

const loginShellStyle = {
  maxWidth: 520,
  margin: "8vh auto 0",
  background: "#fff",
  border: "1px solid #d0d7de",
  borderRadius: 16,
  padding: 24,
  display: "grid",
  gap: 16
} as const;
const loginFormStyle = { display: "grid", gap: 12 } as const;
const loginLabelStyle = { display: "grid", gap: 8 } as const;
const loginInputStyle = { border: "1px solid #d0d7de", borderRadius: 10, padding: 12 } as const;
const loginButtonStyle = { border: "none", borderRadius: 10, padding: "12px 16px", background: "#111827", color: "#fff", cursor: "pointer" } as const;
const loginErrorStyle = { margin: 0, color: "#cf222e" } as const;

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
const authInfoStyle = { display: "grid", gap: 8, padding: 12, background: "#f8fafc", border: "1px solid #d0d7de", borderRadius: 10 } as const;
const authMetaLabelStyle = { color: "#57606a", fontSize: 12 } as const;
const authStatusTextStyle = { fontSize: 14, fontWeight: 600 } as const;
const logoutButtonStyle = { border: "1px solid #d0d7de", background: "#fff", borderRadius: 999, padding: "8px 12px", cursor: "pointer" } as const;
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
const inlineActionsStyle = { display: "flex", gap: 8, flexWrap: "wrap" } as const;
const secondaryActionStyle = { border: "1px solid #d0d7de", background: "#fff", borderRadius: 999, padding: "8px 12px", cursor: "pointer" } as const;
const dangerActionStyle = { ...secondaryActionStyle, borderColor: "#cf222e", color: "#cf222e" } as const;
