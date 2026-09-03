"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  listDocuments,
  getDocumentVerification,
  verifyDocument,
} from "@/lib/documents";
import type { DocumentRecord } from "@/lib/document-types";
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

export default function AuditPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialDocId = searchParams.get("documentId");

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(initialDocId);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Canonical Land Record Form Fields
  const [ownerName, setOwnerName] = useState<string>("");
  const [surveyNumber, setSurveyNumber] = useState<string>("");
  const [khataNumber, setKhataNumber] = useState<string>("");
  const [landArea, setLandArea] = useState<string>("");
  const [areaUnit, setAreaUnit] = useState<string>("Acres");
  const [village, setVillage] = useState<string>("");
  const [tehsil, setTehsil] = useState<string>("");
  const [district, setDistrict] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Load document catalog
  useEffect(() => {
    async function load() {
      setLoadingDocs(true);
      try {
        const rows = await listDocuments();
        setDocuments(rows);
        if (rows.length > 0) {
          if (initialDocId && rows.some((d) => d.id === initialDocId)) {
            setSelectedDocId(initialDocId);
          } else if (!selectedDocId) {
            setSelectedDocId(rows[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load audit documents:", err);
      } finally {
        setLoadingDocs(false);
      }
    }
    load();
  }, [initialDocId]);

  // Load active document details and preview
  useEffect(() => {
    if (!selectedDocId) return;

    async function loadData() {
      setLoadingDetails(true);
      setMessage(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";
        setPreviewUrl(`${apiUrl}/api/documents/${selectedDocId}/preview`);

        const snap = await getDocumentVerification(selectedDocId as string);
        const rec = ((snap?.land_record as unknown) as Record<string, unknown>) || {};

        setOwnerName(typeof rec.owner_name === "string" ? rec.owner_name : "");
        setSurveyNumber(typeof rec.survey_number === "string" ? rec.survey_number : "");
        setKhataNumber(typeof rec.khata_number === "string" ? rec.khata_number : "");
        setLandArea(rec.area ? String(rec.area) : "");
        setAreaUnit((rec.area_unit as string) || "Acres");
        setVillage(typeof rec.village === "string" ? rec.village : "");
        setTehsil(typeof rec.tehsil === "string" ? rec.tehsil : "");
        setDistrict(typeof rec.district === "string" ? rec.district : "");
        setRemarks("");
      } catch (err) {
        console.warn("Error fetching record data:", err);
      } finally {
        setLoadingDetails(false);
      }
    }

    loadData();
  }, [selectedDocId]);

  const filteredDocs = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.filename.toLowerCase().includes(q));
  }, [documents, searchFilter]);

  const activeDoc = documents.find((d) => d.id === selectedDocId);

  // Adjudication dispatcher using verifyDocument
  const handleAdjudicate = async (decision: "VERIFIED" | "ON_HOLD" | "REJECTED") => {
    if (!selectedDocId) return;
    setSubmitting(true);
    setMessage(null);

    const fieldsPayload: Record<string, string | null> = {
      owner_name: ownerName.trim() || null,
      survey_number: surveyNumber.trim() || null,
      khata_number: khataNumber.trim() || null,
      area: landArea.trim() || null,
      area_unit: areaUnit.trim() || "Acres",
      village: village.trim() || null,
      tehsil: tehsil.trim() || null,
      district: district.trim() || null,
    };

    const taggedComment = `[STATUS: ${decision}] ${remarks.trim() || "Decision logged by officer"}`;

    try {
      await verifyDocument(selectedDocId, fieldsPayload, taggedComment);
      setMessage({
        text: `Record successfully marked as ${decision.replace("_", " ")}.`,
        type: "success",
      });
      const rows = await listDocuments();
      setDocuments(rows);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification request failed";
      setMessage({ text: msg, type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page} style={{ height: "100vh", overflow: "hidden", display: "flex" }}>
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

      <main
        className={styles.mainContent}
        style={{
          flex: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "14px 20px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <div className={styles.eyebrow} style={{ fontSize: "10px", marginBottom: "2px" }}>OFFICER WORKSPACE</div>
            <h1 style={{ fontSize: "20px", margin: 0 }}>Audit &amp; Adjudication Desk</h1>
          </div>
          <button
            onClick={() => router.push("/verification")}
            style={{
              padding: "6px 14px",
              backgroundColor: "#059669",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Go to Directory →
          </button>
        </div>

        {/* Status Notification Toast */}
        {message && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "8px",
              backgroundColor: message.type === "success" ? "#ecfdf5" : "#fef2f2",
              border: `1px solid ${message.type === "success" ? "#a7f3d0" : "#fecaca"}`,
              color: message.type === "success" ? "#065f46" : "#991b1b",
            }}
          >
            {message.text}
          </div>
        )}

        {/* 2-Column Split: Working Desk (Left) | Document Queue (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "14px", flex: 1, minHeight: 0 }}>
          {/* LEFT: Compact Working Desk (Deed + Fields) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1.2fr",
              gap: "12px",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
              minHeight: 0,
            }}
          >
            {/* Deed Preview Column (Vertical A4 ratio) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  backgroundColor: "#0f172a",
                  color: "#f8fafc",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeDoc?.filename || "Deed View"}
                </span>
                <span style={{ color: "#38bdf8" }}>PORTRAIT</span>
              </div>

              <div style={{ flex: 1, backgroundColor: "#334155", position: "relative", minHeight: 0 }}>
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    title="Deed Document Preview"
                    style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    Select a document to preview
                  </div>
                )}
              </div>
            </div>

            {/* Cadastral Form + Adjudication Buttons Column */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                minHeight: 0,
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                Cadastral Record (Editable)
              </div>

              {/* 2-Column Compact Input Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Owner Name</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Khasra / Survey #</label>
                  <input
                    type="text"
                    value={surveyNumber}
                    onChange={(e) => setSurveyNumber(e.target.value)}
                    style={{ ...inputStyle, color: "#0284c7", fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Khata Number</label>
                  <input
                    type="text"
                    value={khataNumber}
                    onChange={(e) => setKhataNumber(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Land Area</label>
                  <input
                    type="text"
                    value={landArea}
                    onChange={(e) => setLandArea(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Area Unit</label>
                  <input
                    type="text"
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Village</label>
                  <input
                    type="text"
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Tehsil / Taluk</label>
                  <input
                    type="text"
                    value={tehsil}
                    onChange={(e) => setTehsil(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Officer Remarks */}
              <div style={{ marginTop: "4px" }}>
                <label style={{ fontSize: "10px", fontWeight: 700, color: "#475569" }}>Officer Remarks / Reason</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide reason for approval, rejection or putting on hold..."
                  style={{
                    ...inputStyle,
                    resize: "none",
                    height: "46px",
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: "8px", marginTop: "auto", paddingTop: "8px" }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAdjudicate("ON_HOLD")}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: "#fffbeb",
                    border: "1px solid #fde68a",
                    color: "#92400e",
                  }}
                >
                  Put On Hold
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAdjudicate("REJECTED")}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                  }}
                >
                  Reject Deed
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleAdjudicate("VERIFIED")}
                  style={{
                    padding: "8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    backgroundColor: "#059669",
                    border: "none",
                    color: "#ffffff",
                  }}
                >
                  Accept &amp; Verify
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Document Queue with Search */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "#0f172a", textTransform: "uppercase" }}>
                Queue ({documents.length})
              </div>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Pick file</span>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search file..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                marginBottom: "8px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* Document Queue List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
              {loadingDocs ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                  Loading queue...
                </div>
              ) : filteredDocs.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                  No records match.
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = doc.id === selectedDocId;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: "6px",
                        textAlign: "left",
                        cursor: "pointer",
                        border: isSelected ? "2px solid #0284c7" : "1px solid #e2e8f0",
                        backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: isSelected ? 700 : 500,
                          color: isSelected ? "#0369a1" : "#1e293b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>
                        Status: {doc.verification_status || "Needs Review"}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "5px 8px",
  borderRadius: "5px",
  border: "1px solid #cbd5e1",
  fontSize: "12px",
  outline: "none",
  boxSizing: "border-box",
  marginTop: "2px",
};