import { useEffect, useState } from "react";

import { ApprovalsPanel } from "./components/ApprovalsPanel";
import { ChatShell } from "./components/ChatShell";
import { ConfigPanel } from "./components/ConfigPanel";
import { EventLog } from "./components/EventLog";
import { resolveAgentHost, useAssistantUiState } from "./lib/agent";
import { useClientToolRegistry } from "./lib/clientTools";
import { FeatureLab, type FeatureLabRoute, labRoutes } from "./routes/FeatureLab";

const DEFAULT_VIEW = "console" as const;
const DEFAULT_LAB = labRoutes[0].id;

type ViewMode = typeof DEFAULT_VIEW | "lab";

export default function App() {
  const {
    chat,
    approvals,
    config,
    events,
    summary,
    submitMessage,
    updateConfig,
    applyConfig,
    resolveApproval
  } = useAssistantUiState();
  const { entries: clientTools, rerunTool, rerunAll } = useClientToolRegistry();

  const [view, setView] = useState<ViewMode>(getViewFromHash());
  const [activeLab, setActiveLab] = useState<FeatureLabRoute>(getLabFromHash());

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

  return (
    <main style={pageStyle}>
      <header style={heroStyle}>
        <div>
          <p style={eyebrowStyle}>think-all-in-one</p>
          <h1 style={headingStyle}>Main assistant workspace</h1>
          <p style={subheadingStyle}>
            Lean operator console wired to MainAssistantAgent with chat, approvals, config,
            event visibility, and a lightweight Feature Lab for inspectable integrations.
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
          onClick={navigateToConsole}
        >
          Console
        </button>
        <button
          type="button"
          style={view === "lab" ? activeTabStyle : tabStyle}
          onClick={() => navigateToLab(activeLab)}
        >
          Feature Lab
        </button>
      </nav>

      {view === "console" ? (
        <section style={contentStyle}>
          <div style={primaryColumnStyle}>
            <ChatShell
              messages={chat.messages}
              status={chat.status}
              onSendMessage={submitMessage}
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
          onNavigate={navigateToLab}
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
        />
      )}
    </main>
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
const activeTabStyle = { ...tabStyle, background: "#111827", color: "#fff", borderColor: "#111827" } as const;
const contentStyle = { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, alignItems: "start" } as const;
const primaryColumnStyle = { display: "grid" } as const;
const secondaryColumnStyle = { display: "grid", gap: 16 } as const;
