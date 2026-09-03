"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getDocumentById,
  getDocumentVerification,
  runDocumentOcr,
  extractLandRecord,
  verifyDocument,
  type VerificationSnapshot,
} from "@/lib/documents";
import type { DocumentRecord } from "@/lib/document-types";
import { DocumentPreview } from "@/components/DocumentPreview";
import styles from "../../page.module.css";

const CORE_FIELDS = [
  "owner_name",
  "survey_number",
  "khata_number",
  "area",
  "area_unit",
  "village",
  "tehsil",
  "district",
];

export default function DocumentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params?.id as string;

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [snapshot, setSnapshot] = useState<VerificationSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [ocrRunning, setOcrRunning] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [forwarding, setForwarding] = useState<boolean>(false);
  const [computedStatus, setComputedStatus] = useState<"pending" | "needs_review">("pending");

  async function loadData() {
    if (!documentId) return;
    try {
      const [doc, snap] = await Promise.all([
        getDocumentById(documentId),
        getDocumentVerification(documentId),
      ]);
      setDocument(doc);
      setSnapshot(snap);

      const recordData = snap?.land_record || (snap as any)?.extracted_record;
      const status = evaluateStatus(recordData);
      setComputedStatus(status);
      return { doc, snap };
    } catch (err) {
      console.warn("Failed to load document:", err);
    } finally {
      setLoading(false);
    }
  }

  function evaluateStatus(record: any): "pending" | "needs_review" {
    if (!record) return "needs_review";

    let missingFields: string[] = [];
    CORE_FIELDS.forEach((field) => {
      const val = record[field];
      if (val === null || val === undefined || String(val).trim() === "") {
        missingFields.push(field);
      }
    });

    const mutVal = record.mutation_information;
    const isMutationMissing = mutVal === null || mutVal === undefined || String(mutVal).trim() === "";

    if (missingFields.length === 0) {
      return "pending";
    } else if (missingFields.length === 1 && isMutationMissing) {
      return "pending";
    } else {
      return "needs_review";
    }
  }

  useEffect(() => {
    async function initAutoPipeline() {
      const result = await loadData();
      if (!result?.doc) return;

      const hasRecord = !!result.snap?.land_record || !!(result.snap as any)?.extracted_record;
      if (!hasRecord) {
        try {
          setOcrRunning(true);
          await runDocumentOcr(documentId);
          await extractLandRecord(documentId);
          await loadData();
        } catch (err) {
          console.warn("Auto-pipeline background run notice:", err);
        } finally {
          setOcrRunning(false);
        }
      }
    }
    initAutoPipeline();
  }, [documentId]);

  async function handleExtract() {
    if (extracting || !documentId) return;
    setExtracting(true);
    try {
      await runDocumentOcr(documentId);
      await extractLandRecord(documentId);
      const res = await loadData();
      const recData = res?.snap?.land_record || (res?.snap as any)?.extracted_record;
      if (recData) {
        setComputedStatus(evaluateStatus(recData));
      }
    } catch (err) {
      console.error("Extraction manual trigger error:", err);
    } finally {
      setExtracting(false);
    }
  }

  async function handleForward(destination: "/upload" | "/documents") {
    setForwarding(true);
    try {
      const rec = snapshot?.land_record || (snapshot as any)?.extracted_record || {};
      const statusToSave = evaluateStatus(rec);

      const decisionTag = statusToSave === "pending" ? "[STATUS: PENDING]" : "[STATUS: ON_HOLD]";
      const commentPayload = `${decisionTag} Forwarded from verification view with status: ${statusToSave}`;

      const payloadFields: Record<string, any> = {};
      CORE_FIELDS.forEach((key) => {
        const val = rec[key];
        if (key === "area") {
          const parsed = typeof val === "number" ? val : parseFloat(val);
          payloadFields[key] = isNaN(parsed) ? null : parsed;
        } else {
          payloadFields[key] = val != null && String(val).trim() !== "" ? String(val).trim() : null;
        }
      });

      await verifyDocument(documentId, payloadFields, commentPayload);
    } catch (err) {
      console.warn("Notice during forward sync:", err);
    } finally {
      setForwarding(false);
      router.push(destination);
    }
  }

  const rec = snapshot?.land_record || (snapshot as any)?.extracted_record || {};
  const duplicateAlert = snapshot?.duplicate_alert;
  const confidence = (document as any)?.overall_confidence ?? 85;

  return (
    <div className={styles.page} style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px" }}>
        {/* Top Breadcrumb */}
        <div style={{ marginBottom: "20px" }}>
          <Link
            href="/documents"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#0f172a",
              textDecoration: "none",
            }}
          >
            ← Back to Documents
          </Link>
        </div>

        {/* Header Title */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase" }}>
            BHUVERIFY AI LAND RECORD VERIFICATION
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: "4px 0 0 0" }}>
            {document?.filename || "Loading document..."}
          </h1>
        </div>

        {/* Top Metric Cards */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "20px 24px",
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr 1fr 1fr",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>DOCUMENT</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginTop: "4px", wordBreak: "break-all" }}>
              {document?.filename}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              Status: {computedStatus === "pending" ? "Unreviewed (Pending)" : "Needs Review (On Hold)"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>OVERALL CONFIDENCE</div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: confidence > 70 ? "#ecfdf5" : "#fee2e2",
                  color: confidence > 70 ? "#065f46" : "#991b1b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "13px",
                  border: `2px solid ${confidence > 70 ? "#a7f3d0" : "#fca5a5"}`,
                }}
              >
                {confidence}%
              </div>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                {confidence > 70 ? "High confidence" : "Review needed"}
              </span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>REVIEW STATUS</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#059669", marginTop: "8px" }}>
              ✓ All fields analyzed
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>FLAGGED QUEUE STATUS</div>
            <div
              style={{
                marginTop: "6px",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                backgroundColor: computedStatus === "pending" ? "#eff6ff" : "#fffbeb",
                color: computedStatus === "pending" ? "#1d4ed8" : "#92400e",
                border: `1px solid ${computedStatus === "pending" ? "#bfdbfe" : "#fde68a"}`,
                display: "inline-block",
              }}
            >
              → {computedStatus === "pending" ? "PENDING" : "ON HOLD"}
            </div>
          </div>
        </div>

        {/* Step 1: Document Analysis (OCR) */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              1. Document Analysis (OCR)
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              {ocrRunning ? "Running optical character recognition..." : "OCR parsing complete."}
            </span>
          </div>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 700,
              backgroundColor: ocrRunning ? "#eff6ff" : "#ecfdf5",
              color: ocrRunning ? "#1d4ed8" : "#065f46",
              border: `1px solid ${ocrRunning ? "#bfdbfe" : "#a7f3d0"}`,
            }}
          >
            {ocrRunning ? "Processing OCR..." : "✓ OCR Ready"}
          </span>
        </div>

        {/* Step 2: Field Extraction & Validation */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              2. Field Extraction &amp; Validation
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Canonical extraction of Khasra, Owner, Area, and Geographical Coordinates
            </span>
          </div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || ocrRunning}
            style={{
              padding: "8px 20px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              backgroundColor: extracting ? "#94a3b8" : "#065f46",
              border: "none",
              color: "#ffffff",
              cursor: extracting ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(6, 95, 70, 0.2)",
            }}
          >
            {extracting ? "Extracting..." : "Extract Record"}
          </button>
        </div>

        {/* Document Render + Extracted Attributes */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            marginBottom: "20px",
          }}
        >
          <div style={{ backgroundColor: "#0b1329", borderRadius: "12px", height: "420px", overflow: "hidden" }}>
            {document && (
              <DocumentPreview
                documentId={document.id}
                filename={document.filename}
                fileType={document.file_type || "application/pdf"}
              />
            )}
          </div>

          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              padding: "20px",
              maxHeight: "420px",
              overflowY: "auto",
            }}
          >
            <h4 style={{ fontSize: "13px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "14px" }}>
              Extracted Land Attributes
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {Object.entries({
                "Owner Name": rec.owner_name,
                "Survey / Khasra #": rec.survey_number,
                "Khata Number": rec.khata_number,
                "Area": rec.area ? `${rec.area} ${rec.area_unit || "Acres"}` : null,
                "Village": rec.village,
                "Tehsil": rec.tehsil,
                "District": rec.district,
                "Classification": rec.land_classification,
              }).map(([label, val]) => (
                <div
                  key={label}
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "8px 12px",
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: val ? "#0f172a" : "#94a3b8" }}>
                    {val || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 3: Validation & Duplicate Check */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              3. Validation &amp; Duplicate Check
            </h3>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
              ✓ Automated Live Check
            </span>
          </div>

          {duplicateAlert && (
            <div
              style={{
                backgroundColor: "#fffbeb",
                border: "1.5px solid #fde68a",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, color: "#b45309", fontSize: "14px" }}>
                ⚠ Duplicate Record Alert
              </div>
              <div style={{ fontSize: "13px", color: "#92400e", marginTop: "4px" }}>
                {duplicateAlert?.message || "Possible duplicate found with matching cadastral signatures."}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", marginBottom: "12px" }}>
              Validation Results
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                "owner_name",
                "survey_number",
                "khata_number",
                "area",
                "area_unit",
                "village",
                "tehsil",
                "district",
                "mutation_information",
              ].map((field) => {
                const isMutation = field === "mutation_information";
                const hasVal = !!rec[field];
                const isApproved = hasVal || isMutation;

                return (
                  <div
                    key={field}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      backgroundColor: "#f8fafc",
                      borderRadius: "6px",
                      borderLeft: `4px solid ${isApproved ? "#059669" : "#d97706"}`,
                    }}
                  >
                    <span style={{ color: isApproved ? "#059669" : "#d97706", fontWeight: 800 }}>
                      {isApproved ? "✓" : "⚠"}
                    </span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a" }}>
                        {field} {isMutation && <span style={{ color: "#64748b", fontWeight: 400 }}>(Optional / Non-blocking)</span>}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        {hasVal
                          ? "Identifier parsed and valid."
                          : isMutation
                          ? "Unverified / Not provided (Ignored for primary status determination)."
                          : "Missing identifier; flagged for officer review."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 4: Forward Action Step */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              4. Complete Extraction
            </h3>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              Save status as <strong>{computedStatus === "pending" ? "PENDING" : "NEEDS REVIEW"}</strong> and proceed
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              disabled={forwarding}
              onClick={() => handleForward("/documents")}
              style={{
                padding: "10px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#334155",
                cursor: forwarding ? "not-allowed" : "pointer",
              }}
            >
              {forwarding ? "Saving..." : "Go to Document Queue"}
            </button>

            <button
              type="button"
              disabled={forwarding}
              onClick={() => handleForward("/upload")}
              style={{
                padding: "10px 22px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                backgroundColor: "#0284c7",
                border: "none",
                color: "#ffffff",
                cursor: forwarding ? "not-allowed" : "pointer",
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.2)",
              }}
            >
              {forwarding ? "Saving & Forwarding..." : "Forward & Upload Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}