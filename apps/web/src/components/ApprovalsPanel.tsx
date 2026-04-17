import type { ApprovalItem } from "../lib/agent";

type ApprovalsPanelProps = {
  approvals: ApprovalItem[];
  onResolve(id: string, status: ApprovalItem["status"]): void;
};

export function ApprovalsPanel({ approvals, onResolve }: ApprovalsPanelProps) {
  return (
    <section style={panelStyle}>
      <h2 style={titleStyle}>Approval inbox</h2>
      <div style={listStyle}>
        {approvals.length === 0 ? (
          <p style={emptyStyle}>No pending approvals in this chat.</p>
        ) : (
          approvals.map((approval) => (
            <article key={approval.id} style={itemStyle}>
              <div>
                <strong>{approval.title}</strong>
                <p style={descriptionStyle}>{approval.description}</p>
                <small>Status: {approval.status}</small>
              </div>
              <div style={actionsStyle}>
                <button type="button" onClick={() => onResolve(approval.id, "approved")}>
                  Approve
                </button>
                <button type="button" onClick={() => onResolve(approval.id, "rejected")}>
                  Reject
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

const panelStyle = {
  border: "1px solid #d0d7de",
  borderRadius: 12,
  padding: 16,
  background: "#fff"
} as const;
const titleStyle = { marginTop: 0 } as const;
const listStyle = { display: "grid", gap: 12 } as const;
const itemStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  background: "#f6f8fa",
  borderRadius: 10,
  padding: 12
} as const;
const descriptionStyle = { margin: "6px 0", color: "#57606a" } as const;
const emptyStyle = { margin: 0, color: "#57606a" } as const;
const actionsStyle = { display: "flex", gap: 8 } as const;
