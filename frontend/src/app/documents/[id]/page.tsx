"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { extractLandRecord, getDocumentById, getDocumentVerification, runDocumentOcr, runDocumentValidation, verifyDocument, type ExtractionResult, type OcrResult, type VerificationSnapshot } from "@/lib/documents";
import type { DocumentRecord } from "@/lib/document-types";
import { STATUS_LABELS, CANONICAL_FIELDS } from "@/lib/document-types";
import { SummaryPanel } from "@/components/SummaryPanel";
import { DocumentPreview } from "@/components/DocumentPreview";
import { FieldsPanel } from "@/components/FieldsPanel";
import { ValidationPanel } from "@/components/ValidationPanel";
import { AuditHistory } from "@/components/AuditHistory";

export default function DocumentDetailPage() {
  const params = useParams();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const id = typeof rawId === "string" && rawId.length > 0 ? rawId : null;
  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationSnapshot | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const documentId = id;

    if (!documentId) {
      setError("Document ID is missing.");
      setLoading(false);
      return;
    }

    async function fetchDocument() {
      try {
        const item = await getDocumentById(String(documentId));
        if (!item) {
          setError("Document not found.");
          setDocument(null);
        } else {
          setDocument(item);
          const persisted = await getDocumentVerification(String(documentId));
          setVerification(persisted);
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load document.");
      } finally {
        setLoading(false);
      }
    }

    fetchDocument();
  }, [id]);

  const handleRunOcr = async () => {
    if (!id) {
      return;
    }

    setOcrLoading(true);
    setOcrError(null);
    try {
      setOcrResult(await runDocumentOcr(id));
    } catch (ocrLoadError) {
      setOcrError(ocrLoadError instanceof Error ? ocrLoadError.message : "OCR processing failed.");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleExtractLandRecord = async () => {
    if (!id) {
      return;
    }

    setExtractionLoading(true);
    setExtractionError(null);
    try {
      const result = await extractLandRecord(id);
      setExtractionResult(result);
      setVerification(await getDocumentVerification(id));
    } catch (extractError) {
      setExtractionError(extractError instanceof Error ? extractError.message : "Land record extraction failed.");
    } finally {
      setExtractionLoading(false);
    }
  };

  const handleRunValidation = async () => {
    if (!id) {
      return;
    }
    setValidationLoading(true);
    setValidationError(null);
    try {
      const result = await runDocumentValidation(id);
      setExtractionResult((current) =>
        current
          ? {
              ...current,
              validation_results: result.validation_results,
              overall_confidence: result.overall_confidence,
              duplicate_detected: result.duplicate_detected,
              duplicate_score: result.duplicate_score,
              matches: result.matches,
              validation_status: result.validation_status,
            }
          : current
      );
      setVerification(await getDocumentVerification(id));
    } catch (validationError) {
      setValidationError(validationError instanceof Error ? validationError.message : "Validation failed.");
    } finally {
      setValidationLoading(false);
    }
  };

  const handleReviewRecord = () => {
    if (!extractionResult) {
      return;
    }
    const reviewEdits: Record<string, string> = {};
    for (const field of CANONICAL_FIELDS) {
      const confidence = extractionResult.field_confidence[field as keyof typeof extractionResult.field_confidence];
      if (confidence < 85) {
        const value = extractionResult.extracted_record[field as keyof typeof extractionResult.extracted_record];
        reviewEdits[field] = value === null ? "" : String(value);
      }
    }
    setEdits(reviewEdits);
    setReviewMode(true);
    setVerifySuccess(false);
  };

  const handleSaveAndVerify = async () => {
    if (!id) {
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const fields = Object.fromEntries(
        Object.entries(edits).map(([field, value]) => [field, value.trim() || null])
      );
      const result = await verifyDocument(id, fields, "Verified against source document");
      setExtractionResult((current) =>
        current
          ? {
              ...current,
              extracted_record: result.land_record,
              field_confidence: result.field_confidence,
              overall_confidence: result.overall_confidence,
              validation_results: result.validation_results,
              review_required: result.review_required,
            }
          : current
      );
      setVerification(await getDocumentVerification(id));
      setReviewMode(false);
      setVerifySuccess(result.verification_status === "verified");
    } catch (saveError) {
      setVerifyError(saveError instanceof Error ? saveError.message : "Verification failed.");
    } finally {
      setVerifyLoading(false);
    }
  };

  const fieldsNeedingReview =
    extractionResult?.validation_results?.filter((v) => v.status !== "pass").length || 0;

  if (!loading && !document && !error) {
    notFound();
  }

  return (
    <main style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      <Link
        href="/documents"
        style={{
          color: "#0f172a",
          fontWeight: 700,
          display: "inline-block",
          marginBottom: 20,
        }}
      >
        ← Back to Documents
      </Link>

      {loading && <p>Loading document...</p>}
      {error && <p style={{ color: "#b42318" }}>{error}</p>}

      {!loading && document && (
        <div style={{ background: "#ffffff", borderRadius: 18, border: "1px solid rgba(15, 23, 42, 0.06)", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "24px 32px", background: "linear-gradient(135deg, #f8fafc 0%, #edf7f1 100%)", borderBottom: "1px solid rgba(15, 23, 42, 0.06)" }}>
            <p
              style={{
                fontSize: 12,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#607089",
                margin: "0 0 8px 0",
              }}
            >
              BhuVerify AI Land Record Verification
            </p>
            <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>{document.filename}</h1>
          </div>

          {/* Summary Panel */}
          <div style={{ padding: "24px 32px" }}>
            <SummaryPanel
              document={document}
              extraction={extractionResult}
              verification={verification}
              fieldsNeedingReview={fieldsNeedingReview}
            />
          </div>

          {/* Processing Pipeline */}
          <div style={{ padding: "0 32px 32px 32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* OCR Section */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 14,
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>1. Document Analysis (OCR)</h3>
                  <button
                    type="button"
                    onClick={handleRunOcr}
                    disabled={ocrLoading}
                    style={{
                      background: ocrLoading ? "#64748b" : "#0f172a",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      cursor: ocrLoading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {ocrLoading ? "Processing..." : ocrResult ? "✓ Completed" : "Run OCR"}
                  </button>
                </div>

                {ocrError && <p style={{ color: "#b42318", margin: "8px 0 0 0" }}>{ocrError}</p>}

                {ocrResult && (
                  <div style={{ background: "#ffffff", borderRadius: 10, padding: 12, marginTop: 12 }}>
                    <p style={{ margin: "0 0 6px 0", fontSize: 12, color: "#607089" }}>
                      <strong>Engine:</strong> {ocrResult.ocr_engine} {ocrResult.ocr_engine_version}
                    </p>
                    <p style={{ margin: "6px 0", fontSize: 12, color: "#607089" }}>
                      <strong>Pages processed:</strong> {ocrResult.pages_processed}
                    </p>
                    {ocrResult.detected_language && (
                      <p style={{ margin: "6px 0", fontSize: 12, color: "#607089" }}>
                        <strong>Language:</strong> {ocrResult.detected_language}{" "}
                        {ocrResult.language_confidence ? `(${ocrResult.language_confidence}% confidence)` : ""}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Extraction Section */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: 14,
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>2. Field Extraction & Validation</h3>
                  <button
                    type="button"
                    onClick={handleExtractLandRecord}
                    disabled={extractionLoading}
                    style={{
                      background: extractionLoading ? "#64748b" : "#116c46",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      cursor: extractionLoading ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {extractionLoading ? "Processing..." : extractionResult ? "✓ Completed" : "Extract Record"}
                  </button>
                </div>

                {extractionError && <p style={{ color: "#b42318", margin: "8px 0 0 0" }}>{extractionError}</p>}

                {extractionResult && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 12 }}>
                    {/* Left: Document Preview */}
                    <div>
                      <h4 style={{ margin: "0 0 12px 0", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        Source Document
                      </h4>
                      {id && (
                        <DocumentPreview
                          documentId={id}
                          filename={document.filename}
                          fileType={document.file_type}
                        />
                      )}
                    </div>

                    {/* Right: Extracted Fields */}
                    <div>
                      <FieldsPanel
                        extraction={extractionResult}
                        reviewMode={reviewMode}
                        edits={edits}
                        onEditChange={(field, value) =>
                          setEdits((current) => ({ ...current, [field]: value }))
                        }
                      />
                    </div>
                  </div>
                )}
                {extractionResult && id && (
                  <Link
                    href={`/gis?documentId=${encodeURIComponent(id)}`}
                    style={{
                      display: "inline-block",
                      marginTop: 16,
                      color: "#075985",
                      fontWeight: 700,
                    }}
                  >
                    Open extracted record in GIS
                  </Link>
                )}
              </div>

              {/* Validation Section */}
              {extractionResult && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 14,
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    padding: 18,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>3. Validation & Duplicate Check</h3>
                    <button
                      type="button"
                      onClick={handleRunValidation}
                      disabled={validationLoading}
                      style={{
                        background: validationLoading ? "#64748b" : "#0f172a",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        padding: "8px 16px",
                        cursor: validationLoading ? "not-allowed" : "pointer",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {validationLoading ? "Running..." : "Run Validation"}
                    </button>
                  </div>

                  {validationError && <p style={{ color: "#b42318", margin: "8px 0 0 0" }}>{validationError}</p>}

                  <ValidationPanel extraction={extractionResult} />
                </div>
              )}

              {/* Review & Verification */}
              {extractionResult && (
                <div
                  style={{
                    background: "#f8fafc",
                    borderRadius: 14,
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    padding: 18,
                  }}
                >
                  <h3 style={{ margin: "0 0 12px 0", fontSize: 16, color: "#0f172a" }}>4. Human Verification</h3>

                  <div style={{ display: "flex", gap: 8 }}>
                    {!reviewMode && extractionResult.review_required && (
                      <button
                        type="button"
                        onClick={handleReviewRecord}
                        style={{
                          background: "#9a6700",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 16px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Review Record
                      </button>
                    )}

                    {reviewMode && (
                      <button
                        type="button"
                        onClick={handleSaveAndVerify}
                        disabled={verifyLoading}
                        style={{
                          background: verifyLoading ? "#64748b" : "#116c46",
                          color: "white",
                          border: "none",
                          borderRadius: 8,
                          padding: "10px 16px",
                          fontWeight: 700,
                          cursor: verifyLoading ? "not-allowed" : "pointer",
                        }}
                      >
                        {verifyLoading ? "Saving..." : "Save & Verify"}
                      </button>
                    )}
                  </div>

                  {verifyError && <p style={{ color: "#b42318", marginTop: 8 }}>{verifyError}</p>}
                  {verifySuccess && (
                    <p style={{ color: "#116c46", marginTop: 8, fontWeight: 700 }}>
                      ✓ Record verified and saved successfully
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Audit History */}
          <div style={{ padding: "0 32px 32px 32px" }}>
            <AuditHistory verification={verification} />
          </div>
        </div>
      )}
    </main>
  );
}
