"use client";

import { useEffect, useState } from "react";

interface DocumentPreviewProps {
  documentId: string;
  filename: string;
  fileType: string | null;
}

export function DocumentPreview({ documentId, filename, fileType }: DocumentPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generatePreviewUrl = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        setError("API URL not configured");
        setLoading(false);
        return;
      }
      const url = `${apiUrl}/api/documents/${encodeURIComponent(documentId)}/preview`;
      setPreviewUrl(url);
      setLoading(false);
    };

    generatePreviewUrl();
  }, [documentId]);

  if (loading) {
    return (
      <div
        style={{
          background: "#f8fafc",
          borderRadius: 14,
          border: "1px solid rgba(15, 23, 42, 0.06)",
          padding: 24,
          textAlign: "center",
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#607089" }}>Loading document preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "#fef2f2",
          borderRadius: 14,
          border: "1px solid #fecaca",
          padding: 24,
          textAlign: "center",
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          <p style={{ color: "#b42318", fontWeight: 700 }}>Preview Error</p>
          <p style={{ color: "#b42318", marginTop: 8 }}>{error}</p>
        </div>
      </div>
    );
  }

  const finalFileType = fileType || "application/octet-stream";
  const isPdf = finalFileType === "application/pdf";
  const isImage = finalFileType.startsWith("image/");

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 14,
        border: "1px solid rgba(15, 23, 42, 0.06)",
        padding: 12,
        minHeight: 400,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, overflow: "auto", position: "relative" }}>
        {isPdf && previewUrl ? (
          <iframe
            src={`${previewUrl}#toolbar=0&view=FitH`}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              minHeight: 400,
            }}
            title="Document Preview"
          />
        ) : isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={filename}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
            }}
          >
            <div>
              <p style={{ fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Document: {filename}</p>
              <p style={{ color: "#607089", fontSize: 13 }}>File type: {finalFileType}</p>
              {previewUrl && (
                <a
                  href={previewUrl}
                  download={filename}
                  style={{
                    marginTop: 14,
                    display: "inline-block",
                    color: "#0f172a",
                    fontWeight: 700,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  Download Document
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
