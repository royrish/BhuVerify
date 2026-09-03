"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { listDocuments } from "@/lib/documents";
import type { DocumentRecord } from "@/lib/document-types";
import styles from "./page.module.css";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Upload Document", href: "/upload" },
  { label: "Documents", href: "/documents" },
  { label: "Verified Records", href: "/verification" },
  { label: "GIS", href: "/gis" },
  { label: "Settings", href: "/settings" },
];

export default function DashboardPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "offline">("checking");

  useEffect(() => {
    async function loadStats() {
      try {
        const docs = await listDocuments();
        setDocuments(docs);
        setBackendStatus("connected");
      } catch (err) {
        console.warn("Error loading dashboard documents:", err);
        setBackendStatus("offline");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalUploaded = documents.length;
  const verifiedCount = documents.filter(
    (d) => (d.verification_status || "").toLowerCase() === "verified"
  ).length;
  const pendingCount = documents.filter(
    (d) => (d.verification_status || "").toLowerCase() !== "verified"
  ).length;

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
            const isActive = item.href === "/";
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
          BhuVerify • Central Intelligence
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <div>
            <div className={styles.eyebrow}>DASHBOARD</div>
            <h1>BhuVerify AI</h1>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "20px",
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#475569",
              }}
            >
              Sample / Prototype
            </span>
            <span
              style={{
                fontSize: "12px",
                padding: "4px 10px",
                borderRadius: "20px",
                backgroundColor: backendStatus === "connected" ? "#ecfdf5" : "#fef2f2",
                border: `1px solid ${backendStatus === "connected" ? "#a7f3d0" : "#fecaca"}`,
                color: backendStatus === "connected" ? "#065f46" : "#991b1b",
                fontWeight: 600,
              }}
            >
              Backend: {backendStatus === "connected" ? "● Connected" : "○ Offline (Check Uvicorn)"}
            </span>
          </div>
        </div>

        <div className={styles.panel} style={{ marginBottom: "24px", padding: "28px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
            INTELLIGENT LAND RECORD DIGITIZATION &amp; VALIDATION SYSTEM
          </div>
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "20px", lineHeight: 1.3 }}>
            Digital verification workflow for land records<br />and parcel documentation.
          </h2>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link
              href="/upload"
              style={{
                padding: "10px 18px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Upload Land Record
            </Link>

            <Link
              href="/verification"
              style={{
                padding: "10px 18px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              View Records
            </Link>

            <Link
              href="/documents?tab=pending"
              style={{
                padding: "10px 18px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#0f172a",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Pending Verification
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          <div className={styles.panel} style={{ padding: "20px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Documents Uploaded</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
              {loading ? "..." : totalUploaded}
            </div>
            <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, marginTop: "4px" }}>Live</div>
          </div>

          <div className={styles.panel} style={{ padding: "20px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Processed Records</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
              {loading ? "..." : totalUploaded}
            </div>
            <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, marginTop: "4px" }}>Land records</div>
          </div>

          <div className={styles.panel} style={{ padding: "20px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Verified Records</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
              {loading ? "..." : verifiedCount}
            </div>
            <div style={{ fontSize: "12px", color: "#059669", fontWeight: 600, marginTop: "4px" }}>Verified</div>
          </div>

          <div className={styles.panel} style={{ padding: "20px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Pending Verification</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", marginTop: "6px" }}>
              {loading ? "..." : pendingCount}
            </div>
            <div style={{ fontSize: "12px", color: "#d97706", fontWeight: 600, marginTop: "4px" }}>Awaiting review</div>
          </div>
        </div>

        {/* Live Feed Table Preview */}
        <div className={styles.panel} style={{ padding: "0px", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>Recent Document Queue</span>
            <Link href="/documents" style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", textDecoration: "none" }}>
              View All Queue →
            </Link>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Filename</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Type</th>
                <th style={{ padding: "12px 18px", textAlign: "left" }}>Status</th>
                <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>Loading queue...</td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>No documents uploaded yet.</td>
                </tr>
              ) : (
                documents.slice(0, 5).map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 18px", fontWeight: 600, color: "#0f172a" }}>{d.filename}</td>
                    <td style={{ padding: "12px 18px", color: "#64748b", fontFamily: "monospace" }}>{d.file_type}</td>
                    <td style={{ padding: "12px 18px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: (d.verification_status || "").toLowerCase() === "verified" ? "#ecfdf5" : "#fffbeb",
                          color: (d.verification_status || "").toLowerCase() === "verified" ? "#065f46" : "#92400e",
                        }}
                      >
                        {(d.verification_status || "PENDING").toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px 18px", textAlign: "right" }}>
                      <Link
                        href={`/documents?tab=pending`}
                        style={{ fontSize: "12px", fontWeight: 700, color: "#0284c7", textDecoration: "none" }}
                      >
                        Inspect →
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