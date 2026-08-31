import { ExtractionResult } from "@/lib/documents";

interface ValidationPanelProps {
  extraction: ExtractionResult;
}

function getSeverityColor(severity: string) {
  if (severity === "error") return "#b42318";
  if (severity === "warning") return "#9a6700";
  return "#116c46";
}

function getSeverityIcon(severity: string) {
  if (severity === "error") return "✕";
  if (severity === "warning") return "⚠";
  return "✓";
}

export function ValidationPanel({ extraction }: ValidationPanelProps) {
  const validationResults = extraction.validation_results || [];
  const hasDuplicate = extraction.duplicate_detected;
  const duplicateScore = extraction.duplicate_score || 0;
  const hasValidationIssues = validationResults.length > 0;

  // Count by severity
  const passCount = validationResults.filter((v) => v.status === "pass").length;
  const warningCount = validationResults.filter((v) => v.status === "warning").length;
  const errorCount = validationResults.filter((v) => v.status === "error").length;

  if (!hasValidationIssues && !hasDuplicate) {
    return (
      <div
        style={{
          background: "#edf7f1",
          border: "1px solid #86efac",
          borderRadius: 10,
          padding: 16,
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: "#116c46", fontSize: 14 }}>
          ✓ All validation checks passed
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Duplicate Detection */}
      {hasDuplicate && (
        <div
          style={{
            background: "#fff7e6",
            border: "1px solid #f4bf5e",
            borderRadius: 10,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "start", gap: 10 }}>
            <span style={{ fontWeight: 700, color: "#9a6700", fontSize: 18, marginTop: -2 }}>⚠</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "#9a6700", fontSize: 14 }}>
                Duplicate Record Alert
              </p>
              <p style={{ margin: "6px 0 0", color: "#9a6700", fontSize: 13 }}>
                Possible duplicate found with {duplicateScore}% confidence match.
              </p>
              {extraction.matches && extraction.matches.length > 0 && (
                <div style={{ margin: "8px 0 0", fontSize: 12, color: "#9a6700" }}>
                  <p style={{ margin: "4px 0 0" }}>
                    <strong>Matched fields:</strong> {extraction.matches[0].matched_fields.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Results Summary */}
      {hasValidationIssues && (
        <div
          style={{
            background: errorCount > 0 ? "#fef2f2" : "#fff7e6",
            border: `1px solid ${errorCount > 0 ? "#fecaca" : "#f4bf5e"}`,
            borderRadius: 10,
            padding: 14,
          }}
        >
          <p style={{ margin: "0 0 10px 0", fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
            Validation Results
          </p>

          {/* Summary counts */}
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            {passCount > 0 && (
              <div style={{ fontSize: 12 }}>
                <span style={{ color: "#116c46", fontWeight: 700 }}>✓ {passCount}</span>
                <span style={{ color: "#607089" }}> passed</span>
              </div>
            )}
            {warningCount > 0 && (
              <div style={{ fontSize: 12 }}>
                <span style={{ color: "#9a6700", fontWeight: 700 }}>⚠ {warningCount}</span>
                <span style={{ color: "#607089" }}> warnings</span>
              </div>
            )}
            {errorCount > 0 && (
              <div style={{ fontSize: 12 }}>
                <span style={{ color: "#b42318", fontWeight: 700 }}>✕ {errorCount}</span>
                <span style={{ color: "#607089" }}> errors</span>
              </div>
            )}
          </div>

          {/* Detailed issues */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {validationResults.map((result, index) => (
              <div
                key={`${result.field_name}-${result.validation_type}-${index}`}
                style={{
                  background: "rgba(255, 255, 255, 0.5)",
                  borderRadius: 6,
                  padding: 8,
                  borderLeft: `3px solid ${getSeverityColor(result.severity)}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
                  <span style={{ color: getSeverityColor(result.severity), fontWeight: 700, marginTop: 2 }}>
                    {getSeverityIcon(result.severity)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#0f172a", fontWeight: 600 }}>
                      {result.field_name}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#607089" }}>
                      {result.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
