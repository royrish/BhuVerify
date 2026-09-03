"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { listDocuments, getDocumentVerification } from "@/lib/documents";
import styles from "../page.module.css";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Upload Document", href: "/upload" },
  { label: "Documents", href: "/documents" },
  { label: "Verified Records", href: "/verification" },
  { label: "GIS", href: "/gis" },
  { label: "Settings", href: "/settings" },
];

interface VerifiedItem {
  id: string;
  filename: string;
  owner_name: string;
  survey_number: string;
  khata_number: string;
  location: string;
  area: string;
  remarks: string;
}

export default function VerifiedRecordsPage() {
  const [records, setRecords] = useState<VerifiedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  async function loadVerifiedRecords() {
    setLoading(true);
    try {
      const allDocs = await listDocuments();
      const verifiedList: VerifiedItem[] = [];

      await Promise.all(
        allDocs.map(async (doc) => {
          try {
            const snap = await getDocumentVerification(doc.id);
            const rec = ((snap?.land_record as unknown) as Record<string, unknown>) || {};
            const actions = snap?.verification_actions || [];

            let isVerified = false;
            let remarksText = "";

            if (actions.length > 0) {
              const lastAction = actions[actions.length - 1];
              const comment = (lastAction.comment || "").trim();
              const upperComment = comment.toUpperCase();
              const actionType = (lastAction.action || "").toLowerCase();

              // Extract actual remark by removing prefix tags
              remarksText = comment
                .replace(/^\[(?:OFFICER ACTION|STATUS|DECISION):[^\]]+\]\s*/i, "")
                .trim();

              if (
                upperComment.includes("VERIFIED") ||
                actionType === "verified" ||
                upperComment.includes("ACCEPT")
              ) {
                if (!upperComment.includes("REJECT") && !upperComment.includes("HOLD")) {
                  isVerified = true;
                }
              }
            }

            if (!isVerified) {
              const docStatus = (doc.verification_status || "").toLowerCase();
              const recStatus = (typeof rec.verification_status === "string" ? rec.verification_status : "").toLowerCase();
              if (docStatus === "verified" || recStatus === "verified") {
                isVerified = true;
              }
            }

            if (isVerified) {
              const locParts = [rec.village, rec.tehsil].filter((v) => typeof v === "string" && v.trim().length > 0);
              const locationStr = locParts.length > 0 ? locParts.join(", ") : "—";

              verifiedList.push({
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
                remarks: remarksText || "Verified by Officer",
              });
            }
          } catch {
            if ((doc.verification_status || "").toLowerCase() === "verified") {
              verifiedList.push({
                id: doc.id,
                filename: doc.filename,
                owner_name: "—",
                survey_number: "—",
                khata_number: "—",
                location: "—",
                area: "N/A",
                remarks: "Verified by Officer",
              });
            }
          }
        })
      );

      setRecords(verifiedList);
    } catch (err) {
      console.warn("Unable to load verified records:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVerifiedRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return records;
    return records.filter(
      (r) =>
        r.owner_name.toLowerCase().includes(term) ||
        r.survey_number.toLowerCase().includes(term) ||
        r.location.toLowerCase().includes(term) ||
        r.remarks.toLowerCase().includes(term) ||
        r.filename.toLowerCase().includes(term)
      );
  }, [records, searchTerm]);

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
            const isActive = item.href === "/verification";
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
          BhuVerify • Verified Archive
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <div>
            <div className={styles.eyebrow}>OFFICIAL DIRECTORY</div>
            <h1>Verified Land Records</h1>
          </div>
          <div className={styles.headerMeta} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search Owner, Khasra, Location..."
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
            <button
              onClick={loadVerifiedRecords}
              style={{
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                padding: "8px 12px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
                color: "#334155",
              }}
            >
              Refresh
            </button>
          </div>
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
                    Loading verified records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                    No verified land records found. Adjudicate documents in the{" "}
                    <Link href="/documents" style={{ color: "#0284c7", fontWeight: 700 }}>
                      Document Queue
                    </Link>{" "}
                    to verify records.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 700, color: "#0f172a" }}>{r.owner_name}</td>
                    <td style={{ padding: "14px 18px", color: "#0284c7", fontWeight: 600, fontFamily: "monospace" }}>{r.survey_number}</td>
                    <td style={{ padding: "14px 18px", color: "#475569" }}>{r.location}</td>
                    <td style={{ padding: "14px 18px", fontWeight: 600, color: "#059669" }}>{r.area}</td>
                    <td style={{ padding: "14px 18px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          color: "#065f46",
                        }}
                      >
                        VERIFIED
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", color: "#475569", fontStyle: r.remarks === "—" ? "normal" : "italic", maxWidth: "200px" }}>
                      {r.remarks}
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                        <Link
                          href={`/audit?documentId=${r.id}&tab=ocr`}
                          style={{
                            display: "inline-block",
                            padding: "5px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor: "#f8fafc",
                            border: "1px solid #cbd5e1",
                            color: "#334155",
                            textDecoration: "none",
                          }}
                        >
                          OCR
                        </Link>
                        <Link
                          href={`/gis?documentId=${r.id}`}
                          style={{
                            display: "inline-block",
                            padding: "5px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: 700,
                            backgroundColor: "#f0f9ff",
                            border: "1px solid #bae6fd",
                            color: "#0369a1",
                            textDecoration: "none",
                          }}
                        >
                          GIS
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}