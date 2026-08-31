import { ExtractionResult } from "@/lib/documents";
import { CANONICAL_FIELDS } from "@/lib/document-types";

interface FieldsPanelProps {
  extraction: ExtractionResult;
  reviewMode: boolean;
  edits: Record<string, string>;
  onEditChange: (field: string, value: string) => void;
}

function confidenceColor(score: number) {
  if (score >= 85) return "#116c46";
  if (score >= 70) return "#9a6700";
  return "#b42318";
}

function confidenceLabel(score: number) {
  if (score >= 85) return "High";
  if (score >= 70) return "Medium";
  return "Low";
}

function getFieldStatus(value: any, confidence: number): { icon: string; label: string; color: string } {
  if (value === null || value === undefined || value === "") {
    return { icon: "○", label: "Missing", color: "#b42318" };
  }
  if (confidence >= 85) {
    return { icon: "✓", label: "Verified", color: "#116c46" };
  }
  if (confidence >= 70) {
    return { icon: "⚠", label: "Review", color: "#9a6700" };
  }
  return { icon: "!", label: "Low confidence", color: "#b42318" };
}

export function FieldsPanel({ extraction, reviewMode, edits, onEditChange }: FieldsPanelProps) {
  const fieldsNeedingReview = CANONICAL_FIELDS.filter(
    (field) =>
      extraction.field_confidence[field as keyof typeof extraction.field_confidence] < 85 ||
      extraction.extracted_record[field as keyof typeof extraction.extracted_record] === null
  ).length;

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: 18, color: "#0f172a" }}>Extracted Fields</h2>

      {fieldsNeedingReview > 0 && !reviewMode && (
        <div
          style={{
            background: "#fff7e6",
            border: "1px solid #f4bf5e",
            borderRadius: 10,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#9a6700", fontSize: 14 }}>
            ⚠ {fieldsNeedingReview} {fieldsNeedingReview === 1 ? "field" : "fields"} need review before verification
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CANONICAL_FIELDS.map((field) => {
          const value = extraction.extracted_record[field as keyof typeof extraction.extracted_record];
          const confidence = extraction.field_confidence[field as keyof typeof extraction.field_confidence];
          const status = getFieldStatus(value, confidence);
          const isEditing = reviewMode && confidence < 85;
          const displayValue = isEditing ? edits[field] ?? "" : value === null ? "—" : String(value);

          return (
            <div
              key={field}
              style={{
                background: "#ffffff",
                border: `1px solid ${isEditing ? "#0f172a" : "rgba(15, 23, 42, 0.06)"}`,
                borderRadius: 10,
                padding: 14,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: 14 }}>
                    {field.replaceAll("_", " ")}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: 12,
                      color: "#607089",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ color: status.color, fontWeight: 700 }}>{status.icon}</span>
                    <span style={{ color: status.color, fontWeight: 700 }}>{status.label}</span>
                    {!isEditing && (
                      <>
                        <span style={{ color: "#cbd5e1" }}>·</span>
                        <span style={{ color: confidenceColor(confidence), fontWeight: 700 }}>
                          {confidenceLabel(confidence)} ({confidence}%)
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={displayValue}
                  onChange={(e) => onEditChange(field, e.target.value)}
                  placeholder={value === null ? "Not found" : String(value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #0f172a",
                    fontFamily: "inherit",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
              ) : (
                <p
                  style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: 14,
                    wordBreak: "break-word",
                    fontWeight: 500,
                  }}
                >
                  {displayValue}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
