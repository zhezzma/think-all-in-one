import type { ApprovalItem, AgentEvent, AssistantConfigDraft } from "../../lib/agent";

export type SessionLabProps = {
  summary: {
    messageCount: number;
    connectionState: string;
    pendingApprovals: number;
  };
  messageCount: number;
  approvals: ApprovalItem[];
  config: AssistantConfigDraft;
  events: AgentEvent[];
};

export function SessionLab({ summary, messageCount, approvals, config, events }: SessionLabProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Session lab</h2>
      <p style={copyStyle}>
        Inspect the current assistant session state, including message activity, approvals,
        draft config, and recent events.
      </p>

      <div style={gridStyle}>
        <MetricCard label="Chat messages" value={String(messageCount)} />
        <MetricCard label="Connection" value={summary.connectionState} />
        <MetricCard label="Pending approvals" value={String(summary.pendingApprovals)} />
        <MetricCard label="Recent events" value={String(events.length)} />
      </div>

      <div style={stackStyle}>
        <section>
          <h3 style={sectionTitleStyle}>Draft config</h3>
          <pre style={preStyle}>{JSON.stringify(config, null, 2)}</pre>
        </section>

        <section>
          <h3 style={sectionTitleStyle}>Approval state</h3>
          <pre style={preStyle}>{JSON.stringify(approvals, null, 2)}</pre>
        </section>

        <section>
          <h3 style={sectionTitleStyle}>Event timeline</h3>
          <pre style={preStyle}>{JSON.stringify(events.slice(0, 8), null, 2)}</pre>
        </section>
      </div>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
};

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div style={metricCardStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

const panelStyle = { background: "#fff", border: "1px solid #d0d7de", borderRadius: 12, padding: 16 } as const;
const titleStyle = { margin: "0 0 8px" } as const;
const copyStyle = { margin: "0 0 16px", color: "#57606a" } as const;
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 } as const;
const stackStyle = { display: "grid", gap: 16 } as const;
const sectionTitleStyle = { margin: "0 0 8px" } as const;
const preStyle = { margin: 0, background: "#f6f8fa", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;
const metricCardStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa" } as const;
const metricLabelStyle = { color: "#57606a", fontSize: 12, marginBottom: 4 } as const;
const metricValueStyle = { fontWeight: 700 } as const;
