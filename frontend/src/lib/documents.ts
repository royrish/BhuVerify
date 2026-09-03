import type { DocumentRecord } from "./document-types";

export async function listDocuments(): Promise<DocumentRecord[]> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || "Unable to load documents.");
  }

  return (payload ?? []) as DocumentRecord[];
}

export async function getDocumentById(documentId: string): Promise<DocumentRecord | null> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}`);
  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(payload?.detail || "Unable to load document.");
  }

  return payload as DocumentRecord | null;
}

export type OcrResult = {
  document_id: string;
  pages_processed: number;
  raw_text: string;
  ocr_engine: string;
  ocr_engine_version: string;
  processing_status: string;
  detected_language?: string;
  language_code?: string;
  language_confidence?: number;
};

export type ExtractedLandRecord = {
  owner_name: string | null;
  survey_number: string | null;
  khata_number: string | null;
  area: number | null;
  area_unit: string | null;
  village: string | null;
  tehsil: string | null;
  district: string | null;
  land_classification: string | null;
  ownership_details: string | null;
  mutation_information: string | null;
  registration_information: string | null;
};

export type ExtractionResult = {
  document_id: string;
  raw_text: string;
  extracted_record: ExtractedLandRecord;
  field_confidence: Record<keyof ExtractedLandRecord, number>;
  overall_confidence: number;
  validation_results: ValidationResult[];
  review_required: boolean;
  land_record_id?: string;
  duplicate_detected?: boolean;
  duplicate_score?: number;
  matches?: DuplicateMatch[];
  validation_status?: string;
  gis_boundary?: CadastralBoundary | null;
};

export type CadastralBoundary = {
  status: string;
  center: [number, number];
  geojson: GeoJSON.Feature<GeoJSON.Polygon>;
};

export type ValidationResult = {
  field_name: string;
  validation_type: string;
  severity: string;
  status: "pass" | "warning" | "error";
  message: string;
};

export type DuplicateMatch = {
  land_record_id: string;
  matched_fields: string[];
  score: number;
};

export type DashboardStats = {
  documents_uploaded: number;
  processed_records: number;
  verified_records: number;
  needs_review: number;
  pending_verification: number;
  validation_issues: number;
  validation_overview: { passed: number; warnings: number; errors: number };
  recent_records: DocumentRecord[];
};

export type VerificationSnapshot = {
  land_record: DocumentRecord & Record<string, unknown>;
  extracted_fields: Array<{ field_name: string; extracted_value: string | null; confidence: number; verification_status: string }>;
  validation_results: ValidationResult[];
  verification_actions: Array<{ id?: string; field_name: string | null; old_value: string | null; new_value: string | null; action: string; comment: string | null; timestamp: string }>;
  duplicate_alert?: { found: boolean; message: string; matched_fields: string[] };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/dashboard/stats?recent_limit=5`);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || "Unable to load dashboard statistics.");
  }
  return payload as DashboardStats;
}

export async function runDocumentOcr(documentId: string): Promise<OcrResult> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}/ocr`, {
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || "OCR processing failed.");
  }

  return payload as OcrResult;
}

export async function extractLandRecord(documentId: string): Promise<ExtractionResult> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}/extract`, {
    method: "POST",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.detail || "Land record extraction failed.");
  }

  return payload as ExtractionResult;
}

export async function getDocumentVerification(documentId: string): Promise<VerificationSnapshot | null> {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}/verification`);
  const payload = await response.json().catch(() => null);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(payload?.detail || "Unable to load verification details.");
  }
  return payload as VerificationSnapshot;
}

export async function runDocumentValidation(documentId: string) {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}/validate`, {
    method: "POST",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || "Validation failed.");
  }
  return payload as {
    land_record_id: string;
    validation_status: string;
    duplicate_detected: boolean;
    duplicate_score: number;
    matches: DuplicateMatch[];
    validation_results: ValidationResult[];
    overall_confidence: number;
  };
}

export async function verifyDocument(documentId: string, fields: Record<string, string | null>, comment: string) {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/api/documents/${encodeURIComponent(documentId)}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields, comment }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || "Verification failed.");
  }
  return payload;
}

function getApiUrl() {
  // Uses environment variable or safely falls back to your active port 8001 backend
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";
  return apiUrl;
}

export async function uploadDocumentToSupabase(file: File, documentId?: string) {
  const apiUrl = getApiUrl();

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiUrl}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || "The document upload failed.");
  }

  return payload as DocumentRecord;
}