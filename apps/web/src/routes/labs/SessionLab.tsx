import { useMemo, useState } from "react";

import type {
  ApprovalItem,
  AgentEvent,
  AssistantConfigDraft,
  ControlPlaneAgentProfile,
  ControlPlaneSessionRecord
} from "../../lib/agent";

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
  sessionId: string;
  session: ControlPlaneSessionRecord;
  sessions: ControlPlaneSessionRecord[];
  profiles: ControlPlaneAgentProfile[];
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
};

export function SessionLab({
  summary,
  messageCount,
  approvals,
  config,
  events,
  sessionId,
  session,
  sessions,
  profiles,
  onRenameSession,
  onClearSession,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onAssignProfile
}: SessionLabProps) {
  const [renameDraft, setRenameDraft] = useState(session.title ?? "");
  const [profileDraft, setProfileDraft] = useState({
    id: "",
    name: "",
    description: "",
    model: "",
    systemPrompt: ""
  });

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === session.profileId),
    [profiles, session.profileId]
  );

  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Session lab</h2>
      <p style={copyStyle}>
        Inspect the current assistant session state, manage durable session metadata, and maintain
        reusable profiles stored in the control plane.
      </p>

      <div style={gridStyle}>
        <MetricCard label="Session" value={sessionId} />
        <MetricCard label="Chat messages" value={String(messageCount)} />
        <MetricCard label="Connection" value={summary.connectionState} />
        <MetricCard label="Pending approvals" value={String(summary.pendingApprovals)} />
        <MetricCard label="Known sessions" value={String(sessions.length)} />
        <MetricCard label="Profiles" value={String(profiles.length)} />
      </div>

      <div style={stackStyle}>
        <section style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>Active session metadata</h3>
          <div style={metaGridStyle}>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Session title</span>
              <input
                aria-label="Session title"
                style={inputStyle}
                value={renameDraft}
                onChange={(event) => setRenameDraft(event.target.value)}
              />
            </label>

            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Applied profile</span>
              <select
                aria-label="Applied profile"
                style={inputStyle}
                value={session.profileId ?? ""}
                onChange={(event) => {
                  void onAssignProfile(event.target.value || undefined);
                }}
              >
                <option value="">No profile</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={actionRowStyle}>
            <button type="button" style={primaryActionStyle} onClick={() => void onRenameSession(renameDraft)}>
              Save title
            </button>
            <button type="button" style={secondaryActionStyle} onClick={() => void onClearSession()}>
              Clear session history
            </button>
          </div>

          <pre style={preStyle}>
            {JSON.stringify(
              {
                session,
                activeProfile,
                config
              },
              null,
              2
            )}
          </pre>
        </section>

        <section style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>Profile management</h3>
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Profile id</span>
              <input
                aria-label="Profile id"
                style={inputStyle}
                value={profileDraft.id}
                onChange={(event) => setProfileDraft((current) => ({ ...current, id: event.target.value }))}
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Profile name</span>
              <input
                aria-label="Profile name"
                style={inputStyle}
                value={profileDraft.name}
                onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Description</span>
              <input
                aria-label="Profile description"
                style={inputStyle}
                value={profileDraft.description}
                onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label style={fieldStyle}>
              <span style={fieldLabelStyle}>Model override</span>
              <input
                aria-label="Profile model"
                style={inputStyle}
                value={profileDraft.model}
                onChange={(event) => setProfileDraft((current) => ({ ...current, model: event.target.value }))}
              />
            </label>
            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
              <span style={fieldLabelStyle}>System prompt override</span>
              <textarea
                aria-label="Profile system prompt"
                style={textAreaStyle}
                value={profileDraft.systemPrompt}
                onChange={(event) => setProfileDraft((current) => ({ ...current, systemPrompt: event.target.value }))}
              />
            </label>
          </div>

          <div style={actionRowStyle}>
            <button
              type="button"
              style={primaryActionStyle}
              onClick={() =>
                void onCreateProfile({
                  id: profileDraft.id,
                  name: profileDraft.name,
                  description: profileDraft.description,
                  config: {
                    model: profileDraft.model || undefined,
                    systemPrompt: profileDraft.systemPrompt || undefined
                  }
                })
              }
            >
              Create profile
            </button>
            <button
              type="button"
              style={secondaryActionStyle}
              onClick={() =>
                void onUpdateProfile({
                  id: profileDraft.id,
                  name: profileDraft.name,
                  description: profileDraft.description,
                  config: {
                    model: profileDraft.model || undefined,
                    systemPrompt: profileDraft.systemPrompt || undefined
                  }
                })
              }
            >
              Update profile
            </button>
          </div>

          <ul style={listStyle}>
            {profiles.map((profile) => (
              <li key={profile.id} style={listItemStyle}>
                <div>
                  <strong>{profile.name}</strong>
                  <div style={mutedStyle}>{profile.id}</div>
                  {profile.description ? <div style={mutedStyle}>{profile.description}</div> : null}
                </div>
                <div style={actionRowStyle}>
                  <button
                    type="button"
                    style={secondaryActionStyle}
                    onClick={() =>
                      setProfileDraft({
                        id: profile.id,
                        name: profile.name,
                        description: profile.description ?? "",
                        model: profile.config.model ?? "",
                        systemPrompt: profile.config.systemPrompt ?? ""
                      })
                    }
                  >
                    Edit draft
                  </button>
                  <button
                    type="button"
                    style={dangerActionStyle}
                    onClick={() => void onDeleteProfile(profile.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section style={sectionCardStyle}>
          <h3 style={sectionTitleStyle}>Approval state</h3>
          <pre style={preStyle}>{JSON.stringify(approvals, null, 2)}</pre>
        </section>

        <section style={sectionCardStyle}>
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
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginBottom: 16 } as const;
const stackStyle = { display: "grid", gap: 16 } as const;
const sectionCardStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 16, background: "#f6f8fa" } as const;
const sectionTitleStyle = { margin: "0 0 12px" } as const;
const preStyle = { margin: 0, background: "#fff", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 13 } as const;
const metricCardStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#f6f8fa" } as const;
const metricLabelStyle = { color: "#57606a", fontSize: 12, marginBottom: 4 } as const;
const metricValueStyle = { fontWeight: 700 } as const;
const metaGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 } as const;
const formGridStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 } as const;
const fieldStyle = { display: "grid", gap: 6 } as const;
const fieldLabelStyle = { fontSize: 12, color: "#57606a" } as const;
const inputStyle = { border: "1px solid #d0d7de", borderRadius: 8, padding: "8px 10px", background: "#fff" } as const;
const textAreaStyle = { ...inputStyle, minHeight: 96, resize: "vertical" as const };
const actionRowStyle = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } as const;
const primaryActionStyle = { border: "none", borderRadius: 999, padding: "8px 12px", background: "#1f6feb", color: "#fff", cursor: "pointer" } as const;
const secondaryActionStyle = { border: "1px solid #d0d7de", borderRadius: 999, padding: "8px 12px", background: "#fff", cursor: "pointer" } as const;
const dangerActionStyle = { ...secondaryActionStyle, borderColor: "#cf222e", color: "#cf222e" } as const;
const listStyle = { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 } as const;
const listItemStyle = { border: "1px solid #d8dee4", borderRadius: 10, padding: 12, background: "#fff", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" } as const;
const mutedStyle = { color: "#57606a", marginTop: 4, fontSize: 13 } as const;
