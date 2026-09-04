"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import styles from "../page.module.css";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Upload Document", href: "/upload" },
  { label: "Documents", href: "/documents" },
  { label: "Verified Records", href: "/verification" },
  { label: "GIS", href: "/gis" },
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
  mutation_information: "Mutation Info",
  registration_information: "Registration Info",
};

interface DocumentItem {
  id: string;
  filename: string;
  owner_name: string;
  survey_number: string;
  khata_number: string;
  location: string;
  area: string;
  status: "needs_review" | "rejected" | "pending";
  remarks: string;
  confidence: number | null;
}

function DocumentsQueueContent() {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");

  const [records, setRecords] = useState<DocumentItem[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "needs_review" | "rejected" | "pending">(
    requestedTab === "pending" || requestedTab === "unreviewed" ? "pending" : "all"
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Modal State
  const [inspectDocId, setInspectDocId] = useState<string | null>(null);
  const [inspectDoc, setInspectDoc] = useState<DocumentRecord | null>(null);
  const [inspectSnapshot, setInspectSnapshot] = useState<VerificationSnapshot | null>(null);
  const [inspectLoading, setInspectLoading] = useState<boolean>(false);
  const [autoVerifying, setAutoVerifying] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (requestedTab === "pending" || requestedTab === "unreviewed") {
      setFilterTab("pending");
    }
  }, [requestedTab]);

  async function loadPendingQueue() {
    setLoading(true);
    try {
      const docs = await listDocuments();
      const queueList: DocumentItem[] = [];

      await Promise.all(
        docs.map(async (doc) => {
          try {
            const snap = await getDocumentVerification(doc.id);
            const rec = ((snap?.land_record as unknown) as Record<string, unknown>) || {};
            const actions = snap?.verification_actions || [];

            let rawStatus: "verified" | "needs_review" | "rejected" | "pending" = "pending";
            let remarksText = "";

            if (actions.length > 0) {
              const lastAction = actions[actions.length - 1];
              const comment = (lastAction.comment || "").trim();
              const upperComment = comment.toUpperCase();
              const actionType = (lastAction.action || "").toLowerCase();

              remarksText = comment
                .replace(/^\[(?:OFFICER ACTION|STATUS|DECISION):[^\]]+\]\s*/i, "")
                .trim();

              if (
                upperComment.includes("VERIFIED") ||
                actionType === "verified" ||
                upperComment.includes("ACCEPT")
              ) {
                if (!upperComment.includes("REJECT") && !upperComment.includes("HOLD")) {
                  rawStatus = "verified";
                }
              } else if (upperComment.includes("REJECT") || actionType === "rejected") {
                rawStatus = "rejected";
              } else if (upperComment.includes("HOLD") || upperComment.includes("REVIEW") || actionType === "needs_review") {
                rawStatus = "needs_review";
              }
            }

            if (rawStatus === "pending") {
              const docStatus = (doc.verification_status || "").toLowerCase();
              const recStatus = (typeof rec.verification_status === "string" ? rec.verification_status : "").toLowerCase();
              if (docStatus === "verified" || recStatus === "verified") rawStatus = "verified";
              else if (docStatus === "rejected" || recStatus === "rejected") rawStatus = "rejected";
              else if (docStatus === "needs_review" || recStatus === "needs_review") rawStatus = "needs_review";
              else rawStatus = "pending";
            }

            // Exclude fully verified items from the active adjudication queue
            if (rawStatus === "verified") {
              return;
            }

            const locParts = [rec.village, rec.tehsil].filter((v) => typeof v === "string" && v.trim().length > 0);
            const locationStr = locParts.length > 0 ? locParts.join(", ") : "—";

            queueList.push({
              id: doc.id,
              filename: doc.filename,
              owner_name: typeof rec.owner_name === "string" && rec.owner_name ? rec.owner_name : "—",
              survey_number:
                typeof rec.survey_number === "string" && rec.survey_number
                  ? rec.survey_number
                  : typeof rec.khata_number === "string" && rec.khata_number
                  ? rec.khata_number
                  : "—",
              khata_number: typeof rec.khata_number === "string" && rec.khata_number ? rec.khata_number : "—",
              location: locationStr,
              area: rec.area ? `${rec.area} ${rec.area_unit || "Acres"}` : "N/A",
              status: rawStatus as "needs_review" | "rejected" | "pending",
              remarks: remarksText || "—",
              confidence: doc.overall_confidence ?? null,
            });
          } catch {
            const fallbackStatus = (doc.verification_status || "pending").toLowerCase();
            if (fallbackStatus !== "verified") {
              queueList.push({
                id: doc.id,
                filename: doc.filename,
                owner_name: "—",
                survey_number: "—",
                khata_number: "—",
                location: "—",
                area: "N/A",
                status: (fallbackStatus === "rejected" || fallbackStatus === "needs_review" ? fallbackStatus : "pending") as "needs_review" | "rejected" | "pending",
                remarks: "—",
                confidence: doc.overall_confidence ?? null,
              });
            }
          }
        })
      );

      setRecords(queueList);
    } catch (err) {
      console.warn("Unable to load document queue:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPendingQueue();
  }, []);

  async function handleOpenInspect(id: string) {
    setInspectDocId(id);
    setInspectLoading(true);
    setModalMessage(null);
    try {
      const [docData, snapData] = await Promise.all([
        getDocumentById(id),
        getDocumentVerification(id),
      ]);
      setInspectDoc(docData);
      setInspectSnapshot(snapData);
    } catch (err) {
      console.warn("Failed to load OCR inspection data:", err);
    } finally {
      setInspectLoading(false);
    }
  }

  async function handleTriggerAutoVerify() {
    if (!inspectDocId || !inspectSnapshot) return;
    setAutoVerifying(true);
    setModalMessage(null);

    try {
      const rec = ((inspectSnapshot.land_record as unknown) as Record<string, any>) || {};

      const payloadFields: Record<string, any> = {};
      CANONICAL_FIELDS.forEach((key) => {
        const val = rec[key];
        if (key === "area") {
          const parsed = typeof val === "number" ? val : parseFloat(val);
          payloadFields[key] = isNaN(parsed) ? null : parsed;
        } else {
          payloadFields[key] = val != null && String(val).trim() !== "" ? String(val).trim() : null;
        }
      });

      const autoComment = "[STATUS: VERIFIED] Auto-verified via OCR Extraction Engine";
      await verifyDocument(inspectDocId, payloadFields, autoComment);

      setModalMessage({
        type: "success",
        text: "Document auto-verified successfully! Moved to Verified Records.",
      });

      setTimeout(() => {
        setInspectDocId(null);
        loadPendingQueue();
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Auto-verification failed.";
      setModalMessage({ type: "error", text: msg });
    } finally {
      setAutoVerifying(false);
    }
  }

  const counts = useMemo(() => {
    return {
      all: records.length,
      needs_review: records.filter((r) => r.status === "needs_review").length,
      rejected: records.filter((r) => r.status === "rejected").length,
      pending: records.filter((r) => r.status === "pending").length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterTab !== "all" && r.status !== filterTab) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        r.owner_name.toLowerCase().includes(term) ||
        r.survey_number.toLowerCase().includes(term) ||
        r.location.toLowerCase().includes(term) ||
        r.remarks.toLowerCase().includes(term) ||
        r.filename.toLowerCase().includes(term)
      );
    });
  }, [records, filterTab, searchTerm]);

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
            const isActive = item.href === "/documents";
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
          BhuVerify • Document Queue
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <div>
            <div className={styles.eyebrow}>PENDING ADJUDICATION REPOSITORY</div>
            <h1>Document Adjudication Queue</h1>
          </div>
          <div className={styles.headerMeta}>
            <input
              type="text"
              placeholder="Search Owner, Khasra, Remarks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "13px",
                color: "#0f172a",
                outline: "none",
                width: "280px",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border: filterTab === "all" ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "all" ? "#f0f9ff" : "#ffffff",
              color: filterTab === "all" ? "#0369a1" : "#475569",
            }}
          >
            All ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("needs_review")}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border: filterTab === "needs_review" ? "1.5px solid #d97706" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "needs_review" ? "#fffbeb" : "#ffffff",
              color: filterTab === "needs_review" ? "#92400e" : "#475569",
            }}
          >
            On Hold ({counts.needs_review})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("rejected")}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border: filterTab === "rejected" ? "1.5px solid #dc2626" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "rejected" ? "#fef2f2" : "#ffffff",
              color: filterTab === "rejected" ? "#991b1b" : "#475569",
            }}
          >
            Rejected ({counts.rejected})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("pending")}
            style={{
              padding: "7px 16px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border: filterTab === "pending" ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
              backgroundColor: filterTab === "pending" ? "#f0f9ff" : "#ffffff",
              color: filterTab === "pending" ? "#0369a1" : "#475569",
            }}
          >
            Pending ({counts.pending})
          </button>
        </div>

        <div className={styles.panel} style={{ padding: "0px", overflow: "hidden" }}>
          <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", textTransform: "uppercase", fontSize: "11px", fontWeight: 700 }}>
                <th style={{ padding: "14px 18px" }}>Owner Name</th>
                <th style={{ padding: "14px 18px" }}>Khasra / Survey #</th>
                <th style={{ padding: "14px 18px" }}>Location</th>
                <th style={{ padding: "14px 18px" }}>Area</th>
                <th style={{ padding: "14px 18px" }}>Status</th>
                <th style={{ padding: "14px 18px" }}>Officer Remarks</th>
                <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px", textAlign: "center", color: "#94a3b8" }}>
                    Loading pending documents...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    No pending documents found under this filter.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  let badgeStyle = {
                    backgroundColor: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    label: "PENDING",
                  };
                  if (r.status === "rejected") {
                    badgeStyle = {
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      label: "REJECTED",
                    };
                  } else if (r.status === "needs_review") {
                    badgeStyle = {
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      label: "ON HOLD",
                    };
                  }

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: "#0f172a" }}>{r.owner_name}</td>
                      <td style={{ padding: "14px 18px", color: "#0284c7", fontWeight: 600, fontFamily: "monospace" }}>{r.survey_number}</td>
                      <td style={{ padding: "14px 18px", color: "#475569" }}>{r.location}</td>
                      <td style={{ padding: "14px 18px", fontWeight: 600, color: "#0f172a" }}>{r.area}</td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            fontWeight: 700,
                            backgroundColor: badgeStyle.backgroundColor,
                            border: badgeStyle.border,
                            color: badgeStyle.color,
                          }}
                        >
                          {badgeStyle.label}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", color: "#475569", fontStyle: r.remarks === "—" ? "normal" : "italic", maxWidth: "200px" }}>
                        {r.remarks}
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenInspect(r.id)}
                            style={{
                              padding: "5px 11px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              color: "#0f172a",
                              cursor: "pointer",
                            }}
                          >
                            View / OCR
                          </button>
                          <Link
                            href={`/gis?documentId=${r.id}`}
                            style={{
                              display: "inline-block",
                              padding: "5px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: "#f0f9ff",
                              border: "1px solid #bae6fd",
                              color: "#0369a1",
                              textDecoration: "none",
                            }}
                          >
                            GIS
                          </Link>
                          <Link
                            href={`/audit?documentId=${r.id}`}
                            style={{
                              display: "inline-block",
                              padding: "5px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              backgroundColor: "#0284c7",
                              color: "#ffffff",
                              textDecoration: "none",
                            }}
                          >
                            Audit
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: OCR Extraction & Auto-Verification Workspace */}
        {inspectDocId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              backdropFilter: "blur(4px)",
              padding: "24px",
            }}
          >
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                width: "1100px",
                maxWidth: "96vw",
                height: "88vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
            >
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: "#f8fafc",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    OCR Extraction &amp; Auto-Verification
                  </h2>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    {inspectDoc?.filename || "Loading document..."}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={handleTriggerAutoVerify}
                    disabled={autoVerifying || inspectLoading}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 700,
                      backgroundColor: "#059669",
                      border: "none",
                      color: "#ffffff",
                      cursor: autoVerifying ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 4px rgba(5, 150, 105, 0.2)",
                    }}
                  >
                    {autoVerifying ? "Verifying..." : "⚡ Run Auto-Verification"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectDocId(null)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      backgroundColor: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>

              {modalMessage && (
                <div
                  style={{
                    padding: "12px 20px",
                    backgroundColor: modalMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                    borderBottom: `1px solid ${modalMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                    color: modalMessage.type === "success" ? "#065f46" : "#991b1b",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {modalMessage.text}
                </div>
              )}

              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1.1fr 1fr", overflow: "hidden" }}>
                <div style={{ backgroundColor: "#0b1329", borderRight: "1px solid #e2e8f0", overflow: "hidden", position: "relative" }}>
                  {inspectDoc ? (
                    <DocumentPreview
                      documentId={inspectDoc.id}
                      filename={inspectDoc.filename}
                      fileType={inspectDoc.file_type || "application/pdf"}
                    />
                  ) : (
                    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                      Loading Preview...
                    </div>
                  )}
                </div>

                <div style={{ padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                      Extracted Fields
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#059669" }}>
                      {inspectDoc?.overall_confidence != null ? `${inspectDoc.overall_confidence}% Confidence` : "OCR Complete"}
                    </span>
                  </div>

                  {inspectLoading ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                      Extracting metadata...
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {CANONICAL_FIELDS.map((key) => {
                        const rec = ((inspectSnapshot?.land_record as unknown) as Record<string, any>) || {};
                        const val = rec[key];
                        return (
                          <div
                            key={key}
                            style={{
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              padding: "8px 12px",
                            }}
                          >
                            <div style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", marginBottom: "2px" }}>
                              {FIELD_LABELS[key] || key}
                            </div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: val ? "#0f172a" : "#94a3b8" }}>
                              {val ? String(val) : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Need to edit attributes manually?
                    </span>
                    <Link
                      href={`/audit?documentId=${inspectDocId}`}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        color: "#334155",
                        textDecoration: "none",
                      }}
                    >
                      Open Officer Audit Desk →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DocumentsAdjudicationPage() {
  return (
    <Suspense fallback={<div style={{ padding: "32px", color: "#64748b" }}>Loading Documents Queue...</div>}>
      <DocumentsQueueContent />
    </Suspense>
  );
}