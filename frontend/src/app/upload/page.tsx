"use client";

import { useMemo, useRef, useState } from "react";
import { uploadDocumentToSupabase } from "@/lib/documents";
import { MAX_FILE_SIZE_MB, SUPPORTED_FILE_TYPES } from "@/lib/document-types";

const allowedMimeTypes = new Set(SUPPORTED_FILE_TYPES);

export default function UploadPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [result, setResult] = useState<any>(null);

  const fileDetails = useMemo(() => {
    if (!selectedFile) {
      return null;
    }

    return {
      name: selectedFile.name,
      type: selectedFile.type || "Unknown",
      size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
    };
  }, [selectedFile]);

  const handleFileSelection = (file: File | undefined) => {
    if (!file) {
      return;
    }

    const isAllowed = allowedMimeTypes.has(file.type) || /\.(pdf|jpe?g|png)$/i.test(file.name);
    if (!isAllowed) {
      setMessage({ type: "error", text: "Unsupported file type. Use PDF, JPG, JPEG, or PNG." });
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setMessage({ type: "error", text: `File is too large. Maximum size is ${MAX_FILE_SIZE_MB} MB.` });
      setSelectedFile(null);
      return;
    }

    setMessage(null);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: "error", text: "Please select a valid document before uploading." });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const savedRecord = await uploadDocumentToSupabase(selectedFile, crypto.randomUUID());

      setResult(savedRecord);
      setMessage({ type: "success", text: "Document uploaded successfully to Supabase Storage and saved to the documents table." });
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      console.error(error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "The document upload failed. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <main style={{ padding: "32px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <p style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "#607089", marginBottom: 8 }}>
          BhuVerify AI
        </p>
        <h1 style={{ fontSize: "2rem", marginBottom: 8 }}>Upload Land Record</h1>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFileSelection(event.dataTransfer.files?.[0]);
        }}
        style={{
          border: "2px dashed #cbd5e1",
          borderRadius: 18,
          padding: "32px 20px",
          background: "#ffffff",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,image/png,image/jpeg,application/pdf"
          onChange={(event) => handleFileSelection(event.target.files?.[0])}
          style={{ display: "block", margin: "0 auto 16px" }}
        />
        <p style={{ color: "#607089", marginBottom: 8 }}>Drag and drop a file here, or browse.</p>
        <p style={{ color: "#607089", fontSize: 14 }}>Accepted formats: PDF, JPG, JPEG, PNG</p>
      </div>

      {fileDetails && (
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p><strong>Selected file:</strong> {fileDetails.name}</p>
          <p><strong>Type:</strong> {fileDetails.type}</p>
          <p><strong>Size:</strong> {fileDetails.size}</p>
        </div>
      )}

      {message && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            marginBottom: 16,
            background: message.type === "success" ? "#edf7f1" : "#fee2e2",
            color: message.type === "success" ? "#116c46" : "#b42318",
          }}
        >
          {message.text}
        </div>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        style={{
          background: uploading ? "#64748b" : "#0f172a",
          color: "white",
          border: "none",
          borderRadius: 12,
          padding: "12px 18px",
          cursor: uploading ? "not-allowed" : "pointer",
          fontWeight: 700,
        }}
      >
        {uploading ? "Uploading..." : "Upload Document"}
      </button>

      {result && (
        <div style={{ marginTop: 24, background: "#ffffff", borderRadius: 12, padding: 18 }}>
          <h3 style={{ marginBottom: 12 }}>Uploaded document</h3>
          <p><strong>ID:</strong> {result.id}</p>
          <p><strong>Filename:</strong> {result.filename}</p>
          <p><strong>Storage path:</strong> {result.storage_path}</p>
          <p><strong>Status:</strong> {result.processing_status}</p>
        </div>
      )}
    </main>
  );
}
