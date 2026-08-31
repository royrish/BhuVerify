import { VerificationSnapshot } from "@/lib/documents";

interface AuditHistoryProps {
  verification: VerificationSnapshot | null;
}

export function AuditHistory({ verification }: AuditHistoryProps) {
  if (!verification || !verification.verification_actions || verification.verification_actions.length === 0) {
    return null;
  }

  const actions = verification.verification_actions;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid rgba(15, 23, 42, 0.06)",
        borderRadius: 10,
        padding: 16,
        marginTop: 20,
      }}
    >
      <h3 style={{ margin: "0 0 12px 0", fontSize: 14, color: "#0f172a", fontWeight: 700 }}>
        Verification History ({actions.length})
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
        {actions.map((action, index) => (
          <div
            key={action.id ?? `${action.timestamp}-${action.field_name}-${index}`}
            style={{
              background: "#f8fafc",
              borderRadius: 6,
              padding: 10,
              borderLeft: "3px solid #0f172a",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  {action.field_name || "Record"} · {action.action}
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#607089" }}>
                  {action.old_value || "—"} → {action.new_value || "—"}
                </p>
                {action.comment && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "#607089", fontStyle: "italic" }}>
                    "{action.comment}"
                  </p>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 10, color: "#cbd5e1", whiteSpace: "nowrap" }}>
                {new Date(action.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
