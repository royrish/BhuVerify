"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { listDocuments, getDocumentVerification } from "@/lib/documents";
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

interface VerifiedItem {
  id: string;
  filename: string;
  owner_name: string;
  survey_number: string;
  khata_number: string;
  village: string;
  tehsil: string;
  area: string;
  status: string;
  confidence: number | null;
}

export default function VerificationPage() {
  const [records, setRecords] = useState<VerifiedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  async function loadVerifiedArchive() {
    setLoading(true);
    try {
      const allDocs = await listDocuments();
      const verifiedList: VerifiedItem[] = [];

      await Promise.all(
        allDocs.map(async (doc) => {
          try {
            const snap = await getDocumentVerification(doc.id);
            const rec = ((snap?.land_record as unknown) as Record<string, unknown>) || {};
            const isVerified =
              doc.verification_status === "verified" ||
              rec.verification_status === "verified";

            if (isVerified) {
              verifiedList.push({
                id: doc.id,
                filename: doc.filename,
                owner_name: typeof rec.owner_name === "string" && rec.owner_name ? rec.owner_name : "N/A",
                survey_number:
                  typeof rec.survey_number === "string" && rec.survey_number
                    ? rec.survey_number
                    : typeof rec.khata_number === "string" && rec.khata_number
                    ? rec.khata_number
                    : "N/A",
                khata_number: typeof rec.khata_number === "string" && rec.khata_number ? rec.khata_number : "N/A",
                village: typeof rec.village === "string" ? rec.village : "",
                tehsil: typeof rec.tehsil === "string" ? rec.tehsil : "",
                area: rec.area ? `${rec.area} ${rec.area_unit || "Acres"}` : "N/A",
                status: "verified",
                confidence: doc.overall_confidence ?? null,
              });
            }
          } catch {
            if (doc.verification_status === "verified") {
              verifiedList.push({
                id: doc.id,
                filename: doc.filename,
                owner_name: "N/A",
                survey_number: "N/A",
                khata_number: "N/A",
                village: "",
                tehsil: "",
                area: "N/A",
                status: "verified",
                confidence: doc.overall_confidence ?? null,
              });
            }
          }
        })
      );

      setRecords(verifiedList);
    } catch (err) {
      console.warn("Unable to load verified archive:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVerifiedArchive();
  }, []);

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return records;
    return records.filter(
      (r) =>
        r.owner_name.toLowerCase().includes(term) ||
        r.survey_number.toLowerCase().includes(term) ||
        r.khata_number.toLowerCase().includes(term) ||
        r.village.toLowerCase().includes(term) ||
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
            <div className={styles.eyebrow}>OFFICIAL REPOSITORY</div>
            <h1>Verified Land Records</h1>
          </div>
          <div className={styles.headerMeta} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search Owner, Khasra, Village..."
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
              onClick={loadVerifiedArchive}
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
                <th style={{ padding: "14px 18px" }}>Khata #</th>
                <th style={{ padding: "14px 18px" }}>Location</th>
                <th style={{ padding: "14px 18px" }}>Registered Area</th>
                <th style={{ padding: "14px 18px" }}>Status</th>
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
                    No verified land records found. Verify documents in the{" "}
                    <Link href="/audit" style={{ color: "#0284c7", fontWeight: 700 }}>
                      Audit Desk
                    </Link>{" "}
                    to populate this directory.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "14px 18px", fontWeight: 700, color: "#0f172a" }}>{r.owner_name}</td>
                    <td style={{ padding: "14px 18px", color: "#0284c7", fontWeight: 600, fontFamily: "monospace" }}>{r.survey_number}</td>
                    <td style={{ padding: "14px 18px", color: "#475569", fontFamily: "monospace" }}>{r.khata_number}</td>
                    <td style={{ padding: "14px 18px", color: "#475569" }}>{r.village ? `${r.village}, ${r.tehsil}` : "—"}</td>
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
                        Verified
                      </span>
                    </td>
                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                      <Link
                        href={`/gis?documentId=${r.id}`}
                        style={{
                          display: "inline-block",
                          padding: "5px 10px",
                          marginRight: "6px",
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
                        href={`/audit`}
                        style={{
                          display: "inline-block",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 600,
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          color: "#334155",
                          textDecoration: "none",
                        }}
                      >
                        Audit
                      </Link>
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