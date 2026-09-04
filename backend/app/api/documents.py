from pathlib import PurePosixPath
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.config import supabase_client
from app.services.extraction import CANONICAL_FIELDS, extract_land_record
from app.services.ocr import OcrProcessingError, process_document
from app.services.persistence import get_verification_snapshot, persist_extraction

router = APIRouter(prefix="/api", tags=["Documents"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_FILE_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
}
ALLOWED_FILE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


class VerifyRequest(BaseModel):
    fields: dict[str, object] = Field(default_factory=dict)
    comment: str | None = None


def validate_upload(filename: str, content_type: str | None, content: bytes):
    extension = PurePosixPath(filename).suffix.lower()
    if content_type not in ALLOWED_FILE_TYPES and extension not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, JPG, JPEG, or PNG.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. Maximum size is 10 MB.")


def _get_document(supabase, document_id: str):
    response = supabase.table("documents").select("*").eq("id", document_id).execute()
    if not response.data:
        response = supabase.table("documents").select("*").eq("filename", document_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return response.data[0]


def _download_document(supabase, document_id: str):
    metadata = _get_document(supabase, document_id)
    try:
        content = supabase.storage.from_("land-records").download(metadata["storage_path"])
    except Exception as error:
        raise HTTPException(status_code=404, detail=f"Document file could not be retrieved: {error}") from error
    return metadata, content


@router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    filename = PurePosixPath(file.filename or "document").name
    content = await file.read()
    validate_upload(filename, file.content_type, content)

    document_id = str(uuid4())
    storage_path = f"{document_id}/{filename.replace(' ', '_')}"
    supabase = supabase_client()

    try:
        supabase.storage.from_("land-records").upload(
            storage_path,
            content,
            {
                "cache-control": "3600",
                "content-type": file.content_type or "application/octet-stream",
                "upsert": "false",
            },
        )

        response = supabase.table("documents").insert({
            "id": document_id,
            "filename": filename,
            "file_type": file.content_type or "application/octet-stream",
            "storage_path": storage_path,
            "processing_status": "uploaded",
            "document_type": "land_record",
            "language": None,
            "source": "manual_upload",
        }).execute()

        # Seed pending status row automatically so it shows up in queues immediately
        supabase.table("land_records").insert({
            "document_id": document_id,
            "verification_status": "pending",
            "validation_status": "pending",
            "overall_confidence": 0,
        }).execute()

    except Exception as error:
        try:
            supabase.storage.from_("land-records").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=f"Document persistence failed: {error}") from error

    if not response.data:
        try:
            supabase.storage.from_("land-records").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Document record was not created.")

    return response.data[0]


@router.get("/documents")
async def list_documents(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    supabase = supabase_client()
    documents = supabase.table("documents").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute().data or []
    if not documents:
        return []

    records = supabase.table("land_records").select(
        "document_id, overall_confidence, validation_status, verification_status"
    ).in_("document_id", [document["id"] for document in documents]).execute().data or []
    
    records_by_document = {record["document_id"]: record for record in records}
    
    enriched_documents = []
    for document in documents:
        rec = records_by_document.get(document["id"], {})
        enriched_documents.append({
            **document,
            "overall_confidence": rec.get("overall_confidence"),
            "validation_status": rec.get("validation_status", "pending"),
            "verification_status": rec.get("verification_status", "pending"),
        })
    return enriched_documents


@router.get("/dashboard/stats")
async def dashboard_stats(recent_limit: int = Query(default=5, ge=1, le=10)):
    supabase = supabase_client()
    documents = supabase.table("documents").select(
        "id, filename, file_type, upload_timestamp, created_at"
    ).order("created_at", desc=True).execute().data or []
    
    records = supabase.table("land_records").select(
        "document_id, overall_confidence, validation_status, verification_status, updated_at"
    ).execute().data or []
    
    validations = supabase.table("validation_results").select("status").execute().data or []
    records_by_document = {record["document_id"]: record for record in records}
    
    recent_records = []
    for document in documents[:recent_limit]:
        record = records_by_document.get(document["id"])
        recent_records.append({
            **document,
            "overall_confidence": record.get("overall_confidence") if record else None,
            "validation_status": record.get("validation_status") if record else "pending",
            "verification_status": record.get("verification_status") if record else "pending",
        })

    validation_overview = {
        "passed": sum(validation["status"] == "pass" for validation in validations),
        "warnings": sum(validation["status"] == "warning" for validation in validations),
        "errors": sum(validation["status"] == "error" for validation in validations),
    }
    
    pending_count = sum(1 for doc in documents if records_by_document.get(doc["id"], {}).get("verification_status", "pending") == "pending")

    return {
        "documents_uploaded": len(documents),
        "processed_records": len(records),
        "verified_records": sum(record.get("verification_status") == "verified" for record in records),
        "needs_review": sum(record.get("verification_status") == "needs_review" for record in records),
        "pending_verification": pending_count,
        "validation_issues": validation_overview["warnings"] + validation_overview["errors"],
        "validation_overview": validation_overview,
        "recent_records": recent_records,
    }


@router.get("/citizen/records")
async def get_citizen_records(survey_number: str = Query(..., description="Survey number of the land record")):
    supabase = supabase_client()
    records = supabase.table("land_records").select(
        "id, document_id, owner_name, survey_number, village, tehsil, area, verification_status, updated_at"
    ).ilike("survey_number", f"%{survey_number}%").execute().data or []

    if not records:
        return []

    doc_ids = [r["document_id"] for r in records if r.get("document_id")]
    documents = []
    if doc_ids:
        documents = supabase.table("documents").select("id, filename, created_at").in_("id", doc_ids).execute().data or []
    
    docs_by_id = {d["id"]: d for d in documents}

    results = []
    for record in records:
        doc = docs_by_id.get(record.get("document_id"), {})
        results.append({
            "land_record_id": record.get("id"),
            "document_id": record.get("document_id"),
            "filename": doc.get("filename", "Land Record Document"),
            "uploaded_at": doc.get("created_at"),
            "owner_name": record.get("owner_name"),
            "survey_number": record.get("survey_number"),
            "location": f"{record.get('village')}, {record.get('tehsil')}",
            "area": record.get("area"),
            "verification_status": record.get("verification_status", "pending"),
            "last_updated": record.get("updated_at"),
        })
    return results


@router.get("/documents/{document_id}")
async def get_document_by_id(document_id: str):
    return _get_document(supabase_client(), document_id)


@router.post("/documents/{document_id}/ocr")
async def run_document_ocr(document_id: str):
    supabase = supabase_client()
    metadata, content = _download_document(supabase, document_id)
    try:
        result = process_document(content, metadata["filename"], metadata.get("file_type"))
    except OcrProcessingError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {error}") from error

    return {
        "document_id": metadata["id"],
        **result,
        "processing_status": "completed" if result["raw_text"] else "completed_empty",
    }


@router.post("/documents/{document_id}/extract")
async def extract_document_fields(document_id: str):
    supabase = supabase_client()
    metadata, content = _download_document(supabase, document_id)
    try:
        ocr_result = process_document(content, metadata["filename"], metadata.get("file_type"))
    except OcrProcessingError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {error}") from error

    extracted_record = extract_land_record(ocr_result["raw_text"])
    try:
        land_record_id, confidence = persist_extraction(supabase, metadata["id"], extracted_record, ocr_result["raw_text"])
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Structured record persistence failed: {error}") from error

    return {
        "document_id": metadata["id"],
        "raw_text": ocr_result["raw_text"],
        "extracted_record": extracted_record,
        "land_record_id": land_record_id,
        **confidence,
    }


@router.post("/documents/{document_id}/validate")
async def validate_document(document_id: str):
    supabase = supabase_client()
    metadata, content = _download_document(supabase, document_id)
    try:
        ocr_result = process_document(content, metadata["filename"], metadata.get("file_type"))
    except OcrProcessingError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {error}") from error

    extracted_record = extract_land_record(ocr_result["raw_text"])
    land_record_id, scored = persist_extraction(supabase, metadata["id"], extracted_record, ocr_result["raw_text"])
    validation_entries = scored.get("validation_results", [])
    duplicate_detected = bool(scored.get("duplicate_detected"))
    duplicate_score = int(scored.get("duplicate_score", 0))
    matches = scored.get("matches", [])

    if duplicate_detected:
        validation_status = "warning" if duplicate_score < 90 else "needs_review"
    elif any(item["status"] == "error" for item in validation_entries):
        validation_status = "error"
    elif any(item["status"] == "warning" for item in validation_entries):
        validation_status = "warning"
    else:
        validation_status = "passed"

    return {
        "land_record_id": land_record_id,
        "validation_status": validation_status,
        "duplicate_detected": duplicate_detected,
        "duplicate_score": duplicate_score,
        "matches": matches,
        "validation_results": validation_entries,
        "overall_confidence": scored["overall_confidence"],
    }


@router.get("/documents/{document_id}/verification")
async def get_document_verification(document_id: str):
    supabase = supabase_client()
    metadata = _get_document(supabase, document_id)
    snapshot = get_verification_snapshot(supabase, metadata["id"])
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No persisted land record found for this document")
    return snapshot


@router.post("/documents/{document_id}/verify")
async def verify_document(document_id: str, request: VerifyRequest):
    supabase = supabase_client()
    metadata = _get_document(supabase, document_id)
    doc_id = metadata["id"]
    
    snapshot = get_verification_snapshot(supabase, doc_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No persisted land record found for this document")

    invalid_fields = set(request.fields) - set(CANONICAL_FIELDS)
    if invalid_fields:
        raise HTTPException(status_code=400, detail=f"Unsupported fields: {', '.join(sorted(invalid_fields))}")

    land_record = snapshot["land_record"]
    updated_record = {field: land_record.get(field) for field in CANONICAL_FIELDS}
    for field, value in request.fields.items():
        updated_record[field] = value

    try:
        content = supabase.storage.from_("land-records").download(metadata["storage_path"])
        ocr_result = process_document(content, metadata["filename"], metadata.get("file_type"))
        land_record_id, scored = persist_extraction(supabase, doc_id, updated_record, ocr_result["raw_text"])
        for field, new_value in request.fields.items():
            old_value = land_record.get(field)
            supabase.table("verification_actions").insert({
                "land_record_id": land_record_id,
                "user_id": None,
                "action": "corrected" if old_value != new_value else "verified",
                "field_name": field,
                "old_value": _as_text(old_value),
                "new_value": _as_text(new_value),
                "comment": request.comment,
            }).execute()

        comment_upper = (request.comment or "").upper()
        is_explicit_approval = "VERIFIED" in comment_upper or "APPROVE" in comment_upper or "ACCEPT" in comment_upper

        if is_explicit_approval:
            has_errors = any(result["status"] == "error" for result in scored["validation_results"])
            status = "verified" if not has_errors else "needs_review"
        else:
            has_errors = any(result["status"] == "error" for result in scored["validation_results"])
            status = "needs_review" if scored.get("review_required") or has_errors else "pending"

        supabase.table("land_records").update({"verification_status": status}).eq("id", land_record_id).execute()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Verification persistence failed: {error}") from error

    return {
        "document_id": doc_id,
        "land_record_id": land_record_id,
        "land_record": {field: updated_record.get(field) for field in CANONICAL_FIELDS},
        "field_confidence": scored["field_confidence"],
        "overall_confidence": scored["overall_confidence"],
        "validation_results": scored["validation_results"],
        "review_required": scored["review_required"],
        "verification_status": status,
        "verification_actions": get_verification_snapshot(supabase, doc_id)["verification_actions"],
    }


@router.get("/documents/{document_id}/preview")
async def preview_document(document_id: str):
    supabase = supabase_client()
    metadata, content = _download_document(supabase, document_id)
    return Response(
        content=content,
        media_type=metadata.get("file_type") or "application/octet-stream",
        headers={
            "Content-Disposition": f"inline; filename=\"{metadata['filename']}\"",
            "Cache-Control": "private, max-age=3600",
        },
    )


def _as_text(value: object) -> str | None:
    return None if value is None else str(value)