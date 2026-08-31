"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listDocuments } from "@/lib/documents";
import type { DocumentRecord } from "@/lib/document-types";
import { STATUS_LABELS } from "@/lib/document-types";

function confidenceLabel(value: number | null | undefined) {
  if (value == null) return "Not processed";
  if (value >= 85) return `${value}% High`;
  if (value >= 70) return `${value}% Medium`;
  return `${value}% Low`;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const rows = await listDocuments();
        setDocuments(rows);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load documents.");
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, []);

  return (
    <main style={{ padding: "32px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#607089" }}>BhuVerify AI</p>
          <h1 style={{ fontSize: "2rem" }}>Documents</h1>
        </div>
        <Link href="/upload" style={{ background: "#0f172a", color: "white", borderRadius: 10, padding: "10px 14px", textDecoration: "none" }}>
          Upload New
        </Link>
      </div>

      {loading && <p>Loading documents...</p>}
      {error && <p style={{ color: "#b42318" }}>{error}</p>}

      {!loading && !error && documents.length === 0 && <p>No documents uploaded yet.</p>}

      {!loading && !error && documents.length > 0 && (
        <div style={{ overflowX: "auto", background: "#ffffff", borderRadius: 18, border: "1px solid rgba(15, 23, 42, 0.06)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f8fafc" }}>
              <tr>
                <th style={{ textAlign: "left", padding: 12 }}>Document</th>
                <th style={{ textAlign: "left", padding: 12 }}>Document Type</th>
                <th style={{ textAlign: "left", padding: 12 }}>Upload Date</th>
                <th style={{ textAlign: "left", padding: 12 }}>Confidence</th>
                <th style={{ textAlign: "left", padding: 12 }}>Validation</th>
                <th style={{ textAlign: "left", padding: 12 }}>Verification Status</th>
                <th style={{ textAlign: "left", padding: 12 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
                  <td style={{ padding: 12 }}>{document.filename}</td>
                  <td style={{ padding: 12 }}>{document.file_type}</td>
                  <td style={{ padding: 12 }}>{document.upload_timestamp ? new Date(document.upload_timestamp).toLocaleString() : "—"}</td>
                  <td style={{ padding: 12 }}>
                    {confidenceLabel(document.overall_confidence)}
                  </td>
                  <td style={{ padding: 12 }}>{document.validation_status || "Not processed"}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{ background: document.verification_status === "verified" ? "#edf7f1" : "#fff7e6", color: document.verification_status === "verified" ? "#116c46" : "#9a6700", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 700 }}>
                      {document.verification_status === "verified" ? "Verified" : document.verification_status === "needs_review" ? "Needs Review" : document.verification_status === "pending" ? "Pending" : STATUS_LABELS[document.processing_status] || "Pending"}
                    </span>
                  </td>
                  <td style={{ padding: 12 }}>
                    <Link href={`/documents/${document.id}`} style={{ color: "#0f172a", fontWeight: 700 }}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
