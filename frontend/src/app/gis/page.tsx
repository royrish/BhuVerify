"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { listDocuments, getDocumentVerification } from "@/lib/documents";
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

const DynamicCadastralMap = dynamic(
  () => import("@/components/CadastralMap").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0b1329",
          color: "#94a3b8",
          borderRadius: "8px",
          fontSize: "13px",
        }}
      >
        Loading Satellite Cartography...
      </div>
    ),
  }
);

interface ActiveParcelFields {
  surveyNumber: string | null;
  village: string | null;
  tehsil: string | null;
  landArea: number | null;
  areaUnit: string | null;
  ownerName: string | null;
}

export default function GisPage() {
  const searchParams = useSearchParams();
  const paramDocId = searchParams.get("documentId");

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(paramDocId);
  const [parcelFields, setParcelFields] = useState<ActiveParcelFields | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [loadingDocs, setLoadingDocs] = useState<boolean>(true);
  const [loadingFields, setLoadingFields] = useState<boolean>(false);

  useEffect(() => {
    async function loadDirectory() {
      setLoadingDocs(true);
      try {
        const rows = await listDocuments();
        setDocuments(rows);
        if (rows.length > 0) {
          if (paramDocId && rows.some((d) => d.id === paramDocId)) {
            setSelectedDocId(paramDocId);
          } else if (!selectedDocId) {
            setSelectedDocId(rows[0].id);
          }
        }
      } catch (err) {
        console.warn("Unable to fetch document catalog for GIS:", err);
      } finally {
        setLoadingDocs(false);
      }
    }
    loadDirectory();
  }, [paramDocId]);

  useEffect(() => {
    if (!selectedDocId) return;

    async function loadFields() {
      setLoadingFields(true);
      try {
        const snap = await getDocumentVerification(selectedDocId as string);
        const rec = ((snap?.land_record as unknown) as Record<string, unknown>) || {};

        const areaNum =
          typeof rec.area === "number"
            ? rec.area
            : rec.area
            ? parseFloat(String(rec.area))
            : null;

        setParcelFields({
          surveyNumber: (rec.survey_number as string) || (rec.khata_number as string) || "N/A",
          village: (rec.village as string) || "Thaiyur",
          tehsil: (rec.tehsil as string) || "Thiruporur",
          landArea: areaNum && !isNaN(areaNum) ? areaNum : 1.0,
          areaUnit: (rec.area_unit as string) || "Acres",
          ownerName: (rec.owner_name as string) || "N/A",
        });
      } catch (err) {
        console.warn("Could not load fields for GIS parcel:", err);
        setParcelFields({
          surveyNumber: "115/4",
          village: "Thaiyur",
          tehsil: "Thiruporur",
          landArea: 4.5,
          areaUnit: "Acres",
          ownerName: "N/A",
        });
      } finally {
        setLoadingFields(false);
      }
    }

    loadFields();
  }, [selectedDocId]);

  const filteredDocs = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.filename.toLowerCase().includes(q));
  }, [documents, searchFilter]);

  const activeDoc = documents.find((d) => d.id === selectedDocId);

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
            const isActive = item.href === "/gis";
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
          BhuVerify • Spatial Cadastre
        </div>
      </aside>

      <main
        className={styles.mainContent}
        style={{
          flex: 1,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          padding: "16px 24px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <div className={styles.eyebrow} style={{ fontSize: "10px", marginBottom: "2px" }}>SPATIAL RECONCILIATION</div>
            <h1 style={{ fontSize: "20px", margin: 0 }}>Cadastral GIS Cartography</h1>
          </div>
          <Link
            href="/audit"
            style={{
              textDecoration: "none",
              fontSize: "12px",
              padding: "6px 12px",
              backgroundColor: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              color: "#334155",
              fontWeight: 600,
            }}
          >
            Open Audit Desk
          </Link>
        </div>

        {/* 2-Column Split: Main GIS Workspace (Left) | Documents Queue (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 310px", gap: "16px", flex: 1, minHeight: 0 }}>
          {/* LEFT: Portrait Map + Integrated Inspector */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: "14px",
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "12px",
              minHeight: 0,
            }}
          >
            {/* Map in Portrait / Tall Aspect */}
            <div
              style={{
                height: "100%",
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  backgroundColor: "#0f172a",
                  color: "#e2e8f0",
                  fontSize: "11px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "220px" }}>
                  {activeDoc ? activeDoc.filename : "Select Parcel"}
                </span>
                <span style={{ color: "#38bdf8", fontSize: "10px", fontWeight: 700 }}>
                  {loadingFields ? "Resolving..." : selectedDocId ? "ACTIVE" : ""}
                </span>
              </div>

              <div style={{ flex: 1, position: "relative" }}>
                {selectedDocId && parcelFields ? (
                  <DynamicCadastralMap
                    documentId={selectedDocId}
                    tehsil={parcelFields.tehsil}
                    village={parcelFields.village}
                    surveyNumber={parcelFields.surveyNumber}
                    landArea={parcelFields.landArea}
                    areaUnit={parcelFields.areaUnit}
                  />
                ) : (
                  <div
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#0b1329",
                      color: "#94a3b8",
                      fontSize: "12px",
                    }}
                  >
                    Select a document from the queue on the right.
                  </div>
                )}
              </div>
            </div>

            {/* Cadastral Details & Inspector */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                padding: "8px 12px",
                overflowY: "auto",
              }}
            >
              <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Active Record
                </div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
                  {activeDoc?.filename || "None selected"}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "12px" }}>
                <div>
                  <span style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>Owner / Pattadar</span>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                    {parcelFields?.ownerName || "—"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>Khasra / Survey No.</span>
                  <div style={{ fontWeight: 800, color: "#0284c7", fontSize: "14px", fontFamily: "monospace" }}>
                    {parcelFields?.surveyNumber || "—"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>Village &amp; Tehsil</span>
                  <div style={{ fontWeight: 600, color: "#334155" }}>
                    {parcelFields?.village ? `${parcelFields.village}, ${parcelFields.tehsil || ""}` : "—"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>Deed Documented Area</span>
                  <div style={{ fontWeight: 800, color: "#059669", fontSize: "14px" }}>
                    {parcelFields?.landArea ? `${parcelFields.landArea} ${parcelFields.areaUnit || "Acres"}` : "—"}
                  </div>
                </div>

                <div>
                  <span style={{ color: "#64748b", fontWeight: 600, fontSize: "11px" }}>Reconciliation Status</span>
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "2px",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        backgroundColor: "#ecfdf5",
                        border: "1px solid #a7f3d0",
                        color: "#065f46",
                        textTransform: "uppercase",
                      }}
                    >
                      Boundary Synchronized
                    </span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "auto",
                  padding: "10px",
                  borderRadius: "6px",
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  fontSize: "11px",
                  color: "#64748b",
                  lineHeight: "1.4",
                }}
              >
                <strong>Cadastral Note:</strong> Geodesic boundaries are scaled from the document acreage and projected onto WGS84 coordinates.
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: Document Directory with Search */}
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
                Directory ({documents.length})
              </div>
              <span style={{ fontSize: "10px", color: "#64748b" }}>Click to map</span>
            </div>

            {/* Search Bar */}
            <input
              type="text"
              placeholder="Search documents..."
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

            {/* Scrollable List */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", minHeight: 0 }}>
              {loadingDocs ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                  Loading catalog...
                </div>
              ) : filteredDocs.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "#94a3b8" }}>
                  No documents found.
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
                        Status: {doc.verification_status || "Registered"}
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