export type DocumentStatus =
  | "uploaded"
  | "processing"
  | "processed"
  | "needs_review"
  | "verified"
  | "failed";

export type DocumentRecord = {
  id: string;
  filename: string;
  file_type: string;
  storage_path: string;
  upload_timestamp: string | null;
  processing_status: DocumentStatus;
  document_type: string | null;
  language: string | null;
  source: string | null;
  created_at: string | null;
  overall_confidence?: number | null;
  validation_status?: string | null;
  verification_status?: string | null;
};

export const STATUS_LABELS: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  processed: "Processed",
  needs_review: "Needs review",
  verified: "Verified",
  failed: "Failed",
};

export const CANONICAL_FIELDS = [
  "owner_name",
  "survey_number",
  "khata_number",
  "area",
  "area_unit",
  "village",
  "tehsil",
  "district",
  "land_classification",
  "ownership_details",
  "mutation_information",
  "registration_information",
];

export const SUPPORTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
export const MAX_FILE_SIZE_MB = 10;
