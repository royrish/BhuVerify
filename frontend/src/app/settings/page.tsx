"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

type UserRole = "citizen" | "official";

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  identifier: string; // Aadhaar / Employee ID
  department?: string;
  token: string;
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loginRole, setLoginRole] = useState<UserRole>("official");
  const [nameInput, setNameInput] = useState<string>("");
  const [emailInput, setEmailInput] = useState<string>("");
  const [idInput, setIdInput] = useState<string>("");
  const [deptInput, setDeptInput] = useState<string>("Revenue Administration Department");
  const [message, setMessage] = useState<string | null>(null);

  // Load existing session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("bhuverify_user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("bhuverify_user");
      }
    } else {
      // Default session as Government Official for immediate demo access
      const defaultUser: AuthUser = {
        name: "Officer A. Sharma",
        email: "a.sharma@revenue.tn.gov.in",
        role: "official",
        identifier: "REV-TN-40892",
        department: "Department of Survey and Settlement",
        token: "BHU-AUTH-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      };
      localStorage.setItem("bhuverify_user", JSON.stringify(defaultUser));
      setCurrentUser(defaultUser);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim() || !idInput.trim()) {
      setMessage("Please fill in all required authentication fields.");
      return;
    }

    const newUser: AuthUser = {
      name: nameInput.trim(),
      email: emailInput.trim(),
      role: loginRole,
      identifier: idInput.trim(),
      department: loginRole === "official" ? deptInput : "Citizen Landowner Portal",
      token: "BHU-AUTH-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
    };

    localStorage.setItem("bhuverify_user", JSON.stringify(newUser));
    setCurrentUser(newUser);
    setMessage(`Logged in successfully as ${newUser.role === "official" ? "Government Officer" : "Citizen"}`);
    setNameInput("");
    setEmailInput("");
    setIdInput("");
  };

  const handleLogout = () => {
    localStorage.removeItem("bhuverify_user");
    setCurrentUser(null);
    setMessage("Logged out successfully. You can log back in as Citizen or Official.");
  };

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
            const isActive = item.href === "/settings";
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
          BhuVerify • Configuration &amp; Access
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.topBar}>
          <div>
            <div className={styles.eyebrow}>SYSTEM CONTROL</div>
            <h1>Settings &amp; Access Authentication</h1>
          </div>
          {currentUser && (
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              Sign Out
            </button>
          )}
        </div>

        {message && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 600,
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              color: "#166534",
              marginBottom: "16px",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Identity & Session Card */}
          <div className={styles.panel} style={{ padding: "24px" }}>
            <h3 style={{ marginBottom: "16px", fontSize: "16px", color: "#0f172a" }}>
              Active User Identity
            </h3>

            {currentUser ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "50%",
                      backgroundColor: currentUser.role === "official" ? "#0284c7" : "#059669",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "18px",
                    }}
                  >
                    {currentUser.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>
                      {currentUser.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b" }}>{currentUser.email}</div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Access Tier:</span>
                    <div style={{ fontWeight: 700, color: currentUser.role === "official" ? "#0369a1" : "#065f46" }}>
                      {currentUser.role === "official" ? "Government Official (Adjudicator)" : "Citizen / Landholder"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>
                      {currentUser.role === "official" ? "Officer Employee ID:" : "Aadhaar / Citizen ID:"}
                    </span>
                    <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#1e293b" }}>
                      {currentUser.identifier}
                    </div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Department / Scope:</span>
                    <div style={{ fontWeight: 600, color: "#334155" }}>{currentUser.department}</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#64748b", fontWeight: 600 }}>Session Token:</span>
                    <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#64748b" }}>
                      {currentUser.token}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button
                    onClick={() => {
                      const switchedRole = currentUser.role === "official" ? "citizen" : "official";
                      const updated: AuthUser = {
                        ...currentUser,
                        role: switchedRole,
                        identifier: switchedRole === "official" ? "REV-OFFICER-551" : "IN-AADHAAR-8902-1134",
                        department: switchedRole === "official" ? "Revenue Administration Department" : "Citizen Landowner Portal",
                      };
                      localStorage.setItem("bhuverify_user", JSON.stringify(updated));
                      setCurrentUser(updated);
                      setMessage(`Switched active profile to: ${switchedRole.toUpperCase()}`);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "#334155",
                    }}
                  >
                    Quick Switch to {currentUser.role === "official" ? "Citizen" : "Official"}
                  </button>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "10px 16px",
                      borderRadius: "6px",
                      border: "1px solid #fecaca",
                      backgroundColor: "#fef2f2",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "#b91c1c",
                    }}
                  >
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setLoginRole("official")}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      border: loginRole === "official" ? "2px solid #0284c7" : "1px solid #cbd5e1",
                      backgroundColor: loginRole === "official" ? "#f0f9ff" : "#ffffff",
                      color: loginRole === "official" ? "#0369a1" : "#475569",
                    }}
                  >
                    Government Official
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginRole("citizen")}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      border: loginRole === "citizen" ? "2px solid #059669" : "1px solid #cbd5e1",
                      backgroundColor: loginRole === "citizen" ? "#ecfdf5" : "#ffffff",
                      color: loginRole === "citizen" ? "#065f46" : "#475569",
                    }}
                  >
                    Citizen / Landowner
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder={loginRole === "official" ? "e.g. Officer K. Ramachandran" : "e.g. Ramesh Patel"}
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      marginTop: "4px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Official / Personal Email</label>
                  <input
                    type="email"
                    required
                    placeholder={loginRole === "official" ? "officer@revenue.tn.gov.in" : "citizen@gmail.com"}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      marginTop: "4px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>
                    {loginRole === "official" ? "Government Employee Code" : "Aadhaar / Citizen Reference ID"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={loginRole === "official" ? "REV-TN-XXXX" : "XXXX-XXXX-XXXX"}
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "12px",
                      outline: "none",
                      marginTop: "4px",
                    }}
                  />
                </div>

                {loginRole === "official" && (
                  <div>
                    <label style={{ fontSize: "11px", fontWeight: 700, color: "#475569" }}>Jurisdiction Department</label>
                    <input
                      type="text"
                      value={deptInput}
                      onChange={(e) => setDeptInput(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "12px",
                        outline: "none",
                        marginTop: "4px",
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    marginTop: "6px",
                    padding: "10px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: loginRole === "official" ? "#0284c7" : "#059669",
                    color: "#ffffff",
                    fontWeight: 700,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Authenticate as {loginRole === "official" ? "Official" : "Citizen"}
                </button>
              </form>
            )}
          </div>

          {/* System & Architecture Preferences */}
          <div className={styles.panel} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 style={{ fontSize: "16px", color: "#0f172a" }}>System Preferences</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                Backend API Gateway
              </label>
              <input
                type="text"
                readOnly
                value="http://127.0.0.1:8001/api"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  color: "#475569",
                }}
              />
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Active FastAPI Uvicorn engine connection endpoint.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                Cadastral GIS Engine Mode
              </label>
              <select
                defaultValue="vector_registry"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "#0f172a",
                  outline: "none",
                }}
              >
                <option value="vector_registry">Deterministic Irregular Parcel Geometry (Production Pilot)</option>
                <option value="bhu_naksha">State Bhu-Naksha WFS Layer (Gov Restricted)</option>
                <option value="centroid_only">Geocoded Anchor Centroid Only</option>
              </select>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Controls geodesic footprint projection over satellite imagery.
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155" }}>
                Minimum Confidence Threshold for Auto-Flagging
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="range"
                  min="50"
                  max="95"
                  defaultValue="75"
                  style={{ flex: 1, accentColor: "#0284c7" }}
                />
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", width: "40px" }}>
                  75%
                </span>
              </div>
              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                Records scoring below this confidence are diverted directly to the Audit Desk.
              </span>
            </div>

            <div
              style={{
                marginTop: "auto",
                padding: "12px",
                borderRadius: "6px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontSize: "11px",
                color: "#64748b",
                lineHeight: "1.5",
              }}
            >
              <strong>BhuVerify Engine Version:</strong> 2.4.0 (Cadastral Spatial &amp; Document Intelligence Core).
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}