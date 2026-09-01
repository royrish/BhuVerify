"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  listDocuments,
  getDocumentById,
  getDocumentVerification,
  verifyDocument,
  type VerificationSnapshot,
} from "@/lib/documents";
import type { DocumentRecord } from "@/lib/document-types";
import { CANONICAL_FIELDS } from "@/lib/document-types";
import { DocumentPreview } from "@/components/DocumentPreview";
import { AuditHistory } from "@/components/AuditHistory";
import styles from "../page.module.css";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Upload Document", href: "/upload" },
  { label: "Documents", href: "/documents" },
  { label: "Verification", href: "/verification" },
  { label: "GIS", href: "/gis" },
  { label: "Audit", href: "/audit" },
  { label: "Settings", href: "/settings" },
];

const FIELD_LABELS: Record<string, string> = {
  owner_name: "Owner Name",
  survey_number: "Khasra / Survey #",
  khata_number: "Khata Number",
  area: "Land Area",
  area_unit: "Area Unit",
  village: "Village",
  tehsil: "Tehsil / Taluk",
  district: "District",
  land_classification: "Classification",
  ownership_details: "Ownership Details",
  mutation_information: "Mutation Information",
  registration_information: "Registration Information",
};

export default function AuditPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(null);
  const [snapshot, setSnapshot] = useState<VerificationSnapshot | null>(null);
  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function refreshQueue(selectId?: string) {
    try {
      const rows = await listDocuments();
      setDocuments(rows);
      if (selectId) {
        setSelectedDocId(selectId);
      } else if (rows.length > 0 && !selectedDocId) {
        setSelectedDocId(rows[0].id);
      }
    } catch (err) {
      console.warn("Unable to load document queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshQueue();
  }, []);

  useEffect(() => {
    if (!selectedDocId) return;
    const docId: string = selectedDocId;

    async function loadDocumentDetails() {
      setLoading(true);
      setStatusMessage(null);
      try {
        const [docData, snapData] = await Promise.all([
          getDocumentById(docId),
          getDocumentVerification(docId),
        ]);

        setActiveDoc(docData);
        setSnapshot(snapData);

        const rec =
          ((snapData?.land_record as unknown) as Record<string, unknown> | undefined) ||
          ((docData as unknown) as Record<string, unknown> | undefined) ||
          {};

        const fieldsObj: Record<string, string> = {};
        CANONICAL_FIELDS.forEach((key) => {
          fieldsObj[key] = rec[key] != null ? String(rec[key]) : "";
        });
        setEditableFields(fieldsObj);
      } catch (err) {
        console.warn("Unable to load document data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDocumentDetails();
  }, [selectedDocId]);

  const handleDecision = async (statusDecision: "verified" | "needs_review" | "rejected") => {
    if (!selectedDocId) {
      alert("Please select a document from the queue first.");
      return;
    }

    const docId: string = selectedDocId;
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const commentPayload = `[Decision: ${statusDecision.toUpperCase()}] ${remarks}`.trim();

      // Format payload accurately according to backend type expectations
      const payloadFields: Record<string, any> = {};
      CANONICAL_FIELDS.forEach((key) => {
        const raw = editableFields[key];
        if (key === "area") {
          const parsed = parseFloat(raw);
          payloadFields[key] = isNaN(parsed) ? null : parsed;
        } else {
          payloadFields[key] = raw && raw.trim().length > 0 ? raw.trim() : null;
        }
      });

      const response = await verifyDocument(docId, payloadFields, commentPayload);

      const returnedStatus = response?.verification_status || statusDecision;

      setStatusMessage({
        type: "success",
        text: `Record successfully adjudicated as: ${returnedStatus.toUpperCase().replace("_", " ")}!`,
      });

      // Refresh snapshot and document queue
      const updatedSnap = await getDocumentVerification(docId);
      if (updatedSnap) setSnapshot(updatedSnap);

      await refreshQueue(docId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Verification action failed.";
      setStatusMessage({ type: "error", text: errMsg });
    } finally {
      setActionLoading(false);
    }
  };

  const currentStatus =
    (snapshot?.land_record as any)?.verification_status ||
    activeDoc?.verification_status ||
    "pending";

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}>B</div>
          <div>
            <div className={styles.brandName}>BhuVerify AI</div>
            <div className={styles.brandSubtext}>Land Record Intelligence</div>
          </div>
        </div>

        <nav className={styles.nav}>
          {navigation.map((item) => {
            const isActive = item.href === "/audit";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFootnote}>
          BhuVerify • Adjudication Desk
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <div>
            <div className={styles.eyebrow}>OFFICER WORKSPACE</div>
            <h1>Audit &amp; Adjudication Desk</h1>
          </div>
          <div className={styles.headerMeta}>
            <Link
              href="/verification"
              className={styles.primaryButton}
              style={{ textDecoration: "none", backgroundColor: "#059669", color: "#ffffff" }}
            >
              Go to Verified Directory →
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Queue selector */}
          <div className={styles.panel} style={{ padding: "14px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", overflowX: "auto" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Queue ({documents.length}):
              </span>
              {documents.length === 0 ? (
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                  {loading ? "Loading records..." : "No documents available."}
                </span>
              ) : (
                documents.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocId(doc.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: isSelected ? "2px solid #0284c7" : "1px solid #cbd5e1",
                        backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                        color: isSelected ? "#0369a1" : "#334155",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {doc.filename}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {statusMessage && (
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 700,
                backgroundColor: statusMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                border: `1.5px solid ${statusMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                color: statusMessage.type === "success" ? "#065f46" : "#991b1b",
              }}
            >
              {statusMessage.text}
            </div>
          )}

          {/* 2-Column Adjudication Workspace */}
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "20px" }}>
            {/* Left: Document preview */}
            <div className={styles.panel} style={{ display: "flex", flexDirection: "column", height: "720px", padding: "18px" }}>
              <div className={styles.panelHeader} style={{ marginBottom: "12px" }}>
                <h3>Original Deed (Reference)</h3>
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    backgroundColor: currentStatus === "verified" ? "#d1fae5" : "#f1f5f9",
                    color: currentStatus === "verified" ? "#065f46" : "#475569",
                  }}
                >
                  Status: {currentStatus}
                </span>
              </div>
              <div style={{ flex: 1, backgroundColor: "#0b1329", borderRadius: "8px", overflow: "hidden" }}>
                {activeDoc ? (
                  <DocumentPreview
                    documentId={activeDoc.id}
                    filename={activeDoc.filename}
                    fileType={activeDoc.file_type || "application/pdf"}
                  />
                ) : (
                  <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px" }}>
                    Select a document to preview
                  </div>
                )}
              </div>
            </div>

            {/* Right: Correction form & adjudication controls */}
            <div className={styles.panel} style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div className={styles.panelHeader} style={{ marginBottom: "14px" }}>
                  <h3>Cadastral Attributes (Editable)</h3>
                  <span style={{ fontSize: "12px", color: "#059669", fontWeight: 700 }}>
                    {activeDoc?.overall_confidence != null ? `${activeDoc.overall_confidence}% Confidence` : "Review"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", maxHeight: "350px", overflowY: "auto", paddingRight: "4px" }}>
                  {CANONICAL_FIELDS.map((fieldKey) => (
                    <div key={fieldKey} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b" }}>
                        {FIELD_LABELS[fieldKey] || fieldKey}
                      </label>
                      <input
                        type="text"
                        value={editableFields[fieldKey] ?? ""}
                        onChange={(e) => setEditableFields({ ...editableFields, [fieldKey]: e.target.value })}
                        style={{
                          backgroundColor: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          fontSize: "12px",
                          color: "#0f172a",
                          outline: "none",
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                    Adjudication Remarks / Reason:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide reason for approval, rejection or putting on hold..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      fontSize: "12px",
                      color: "#0f172a",
                      outline: "none",
                      resize: "none",
                    }}
                  />
                </div>

                {snapshot && (
                  <div style={{ marginTop: "12px" }}>
                    <AuditHistory verification={snapshot} />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision("needs_review")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#b45309",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? "Saving..." : "Put On Hold"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision("rejected")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? "Saving..." : "Reject Deed"}
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleDecision("verified")}
                  style={{
                    padding: "12px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    backgroundColor: "#059669",
                    border: "none",
                    color: "#ffffff",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                  }}
                >
                  {actionLoading ? "Saving..." : "Accept & Verify"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}