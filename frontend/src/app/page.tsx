"use client";

import { useEffect, useState } from "react";
import { getDashboardStats, type DashboardStats } from "@/lib/documents";
import styles from "./page.module.css";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Upload Document", href: "/upload" },
  { label: "Documents", href: "/documents" },
  { label: "Verification", href: "/verification" },
  { label: "GIS", href: "/gis" },
  { label: "Audit", href: "/audit" },
  { label: "Settings", href: "/settings" },
];

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "offline">("checking");
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

    fetch(`${apiUrl}/api/health`)
      .then((response) => {
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("offline");
        }
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  }, []);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setDashboard(await getDashboardStats());
      } catch (loadError) {
        setDashboardError(loadError instanceof Error ? loadError.message : "Unable to load dashboard statistics.");
      } finally {
        setDashboardLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const backendLabel =
    backendStatus === "connected"
      ? "Connected"
      : backendStatus === "offline"
        ? "Offline"
        : "Checking";

  const backendClass =
    backendStatus === "connected"
      ? styles.online
      : backendStatus === "offline"
        ? styles.offline
        : styles.pending;

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandMark}>B</div>
          <div>
            <p className={styles.brandName}>BhuVerify AI</p>
            <span className={styles.brandSubtext}>Land Record Intelligence</span>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          {navigation.map((item, index) => (
            <a
              key={item.label}
              href={item.href}
              className={`${styles.navItem} ${index === 0 ? styles.active : ""}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className={styles.sidebarFootnote}>
          Live operator overview from the secured records service.
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.eyebrow}>Dashboard</p>
            <h1>BhuVerify AI</h1>
          </div>

          <div className={styles.headerMeta}>
            <span className={styles.sampleBadge}>Sample / Prototype</span>
            <div className={styles.backendStatus}>
              <span>Backend:</span>
              <span className={`${styles.dot} ${backendClass}`} aria-live="polite">
                ●
              </span>
              <span>{backendLabel}</span>
            </div>
          </div>
        </header>

        <section className={styles.hero}>
          <div>
            <p className={styles.heroLabel}>Intelligent Land Record Digitization &amp; Validation System</p>
            <h2>Digital verification workflow for land records and parcel documentation.</h2>
          </div>
          <a href="/upload" className={styles.primaryButton}>
            Upload Land Record
          </a>
        </section>

        <div className={styles.headerMeta} style={{ marginBottom: 20 }}>
          <a href="/upload" className={styles.primaryButton}>Upload Document</a>
          <a href="/documents" className={styles.primaryButton}>View Records</a>
          <a href="/documents" className={styles.primaryButton}>Pending Verification</a>
        </div>

        <section className={styles.statsGrid} aria-label="Summary statistics">
          {[
            ["Documents Uploaded", dashboard?.documents_uploaded, "Live"],
            ["Processed Records", dashboard?.processed_records, "Land records"],
            ["Verified Records", dashboard?.verified_records, "Verified"],
            ["Pending Verification", dashboard?.pending_verification, "Awaiting review"],
            ["Validation Issues", dashboard?.validation_issues, "Warnings + errors"],
          ].map(([label, value, change]) => (
            <article key={String(label)} className={styles.statCard}>
              <span>{label}</span>
              <strong>{dashboardLoading ? "..." : String(value ?? 0)}</strong>
              <em>{change}</em>
            </article>
          ))}
        </section>

        {dashboardError && <p style={{ color: "#b42318", marginBottom: 20 }}>{dashboardError}</p>}

        <section className={styles.contentGrid}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Recent document queue</h3>
              <span>Live feed</span>
            </div>
            <ul className={styles.list}>
              {!dashboardLoading && dashboard?.recent_records.length === 0 && <li className={styles.listItem}>No documents processed yet.</li>}
              {dashboard?.recent_records.map((item) => (
                <li key={item.id} className={styles.listItem}>
                  <div>
                    <a href={`/documents/${item.id}`}><strong>{item.filename}</strong></a>
                    <small>{item.overall_confidence == null ? "Not processed" : `${item.overall_confidence}% confidence`}</small>
                  </div>
                  <span className={styles.badge}>{item.verification_status === "verified" ? "Verified" : item.verification_status === "needs_review" ? "Needs Review" : "Pending"}</span>
                </li>
              ))}
            </ul>
            <a href="/documents" style={{ display: "inline-block", marginTop: 16, color: "#0f172a", fontWeight: 700 }}>View all records →</a>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Validation watchlist</h3>
              <span>Needs attention</span>
            </div>
            <div className={styles.watchlist}>
              <div><label>Passed</label><strong>{dashboardLoading ? "..." : dashboard?.validation_overview.passed ?? 0}</strong></div>
              <div><label>Warnings</label><strong>{dashboardLoading ? "..." : dashboard?.validation_overview.warnings ?? 0}</strong></div>
              <div><label>Errors</label><strong>{dashboardLoading ? "..." : dashboard?.validation_overview.errors ?? 0}</strong></div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
