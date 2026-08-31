import { ExtractionResult, VerificationSnapshot } from "@/lib/documents";

interface SummaryPanelProps {
  document: { filename: string; processing_status: string };
  extraction: ExtractionResult | null;
  verification: VerificationSnapshot | null;
  fieldsNeedingReview: number;
}

function getStatusColor(status: string) {
  if (status.includes("verified")) return "#116c46";
  if (status.includes("review")) return "#9a6700";
  return "#0f172a";
}

function getStatusLabel(status: string) {
  if (status.includes("verified")) return "✓ Verified";
  if (status.includes("review")) return "⚠ Needs Review";
  if (status.includes("pending")) return "→ Pending";
  return status;
}

export function SummaryPanel({
  document,
  extraction,
  verification,
  fieldsNeedingReview,
}: SummaryPanelProps) {
  const overallConfidence = extraction?.overall_confidence || 0;
  const verificationStatus = verification?.land_record?.verification_status || "pending";

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #edf7f1 100%)",
        borderRadius: 18,
        border: "1px solid rgba(15, 23, 42, 0.08)",
        padding: 24,
        marginBottom: 24,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        {/* Document */}
        <div>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#607089", marginBottom: 6 }}>
            Document
          </p>
          <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a", wordBreak: "break-word" }}>{document.filename}</h3>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "#607089" }}>Status: {document.processing_status}</p>
        </div>

        {/* Confidence */}
        <div>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#607089", marginBottom: 6 }}>
            Overall Confidence
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: overallConfidence >= 85 ? "#116c46" : overallConfidence >= 70 ? "#9a6700" : "#b42318",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: 20,
              }}
            >
              {overallConfidence}%
            </div>
            <span style={{ fontSize: 13, color: "#607089" }}>
              {overallConfidence >= 85 ? "High" : overallConfidence >= 70 ? "Medium" : "Low"} confidence
            </span>
          </div>
        </div>

        {/* Fields Review */}
        <div>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#607089", marginBottom: 6 }}>
            Review Status
          </p>
          {fieldsNeedingReview > 0 ? (
            <div style={{ background: "#fff7e6", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#9a6700", fontSize: 16 }}>{fieldsNeedingReview}</p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9a6700" }}>
                {fieldsNeedingReview === 1 ? "field needs" : "fields need"} review
              </p>
            </div>
          ) : (
            <div style={{ background: "#edf7f1", borderRadius: 10, padding: 12 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#116c46", fontSize: 14 }}>✓ All fields reviewed</p>
            </div>
          )}
        </div>

        {/* Verification */}
        <div>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#607089", marginBottom: 6 }}>
            Verification Status
          </p>
          <div
            style={{
              background: getStatusColor(verificationStatus) + "15",
              borderRadius: 10,
              padding: 12,
              borderLeft: `4px solid ${getStatusColor(verificationStatus)}`,
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, color: getStatusColor(verificationStatus), fontSize: 14 }}>
              {getStatusLabel(verificationStatus)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
