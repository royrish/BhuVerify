from pathlib import PurePosixPath
from uuid import uuid4

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.config import supabase_client
from app.services.confidence import score_and_validate
from app.services.extraction import CANONICAL_FIELDS, extract_land_record
from app.services.ocr import OcrProcessingError, process_document
from app.services.persistence import get_verification_snapshot, persist_extraction
from app.services.reference_validation import detect_duplicate_records, run_cross_record_validation

router = APIRouter(prefix="/api")


class VerifyRequest(BaseModel):
    fields: dict[str, object] = Field(default_factory=dict)
    comment: str | None = None

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
ALLOWED_FILE_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
}
ALLOWED_FILE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def validate_upload(filename: str, content_type: str | None, content: bytes):
    extension = PurePosixPath(filename).suffix.lower()
    if content_type not in ALLOWED_FILE_TYPES and extension not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF, JPG, JPEG, or PNG.")

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="File is too large. Maximum size is 10 MB.")


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
            "language": None,  # Will be set after OCR language detection
            "source": "manual_upload",
        }).execute()
    except Exception as error:
        try:
            supabase.storage.from_("land-records").remove([storage_path])
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=str(error)) from error

    if not response.data:
        raise HTTPException(status_code=502, detail="Document record was not created.")

    return response.data[0]


@router.get("/documents")
async def list_documents(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0)):
    supabase = supabase_client()
    documents = supabase.table("documents").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute().data or []
    if not documents:
        return []
    records = supabase.table("land_records").select("document_id, overall_confidence, validation_status, verification_status").in_("document_id", [document["id"] for document in documents]).execute().data or []
    records_by_document = {record["document_id"]: record for record in records}
    return [
        {
            **document,
            **records_by_document.get(document["id"], {}),
        }
        for document in documents
    ]


@router.get("/dashboard/stats")
async def dashboard_stats(recent_limit: int = Query(default=5, ge=1, le=10)):
    supabase = supabase_client()
    documents = supabase.table("documents").select("id, filename, file_type, upload_timestamp, created_at").order("created_at", desc=True).execute().data or []
    records = supabase.table("land_records").select("document_id, overall_confidence, validation_status, verification_status, updated_at").execute().data or []
    validations = supabase.table("validation_results").select("status").execute().data or []
    records_by_document = {record["document_id"]: record for record in records}
    recent_records = []
    for document in documents[:recent_limit]:
        record = records_by_document.get(document["id"])
        recent_records.append({
            **document,
            "overall_confidence": record.get("overall_confidence") if record else None,
            "validation_status": record.get("validation_status") if record else None,
            "verification_status": record.get("verification_status") if record else "pending",
        })

    validation_overview = {
        "passed": sum(validation["status"] == "pass" for validation in validations),
        "warnings": sum(validation["status"] == "warning" for validation in validations),
        "errors": sum(validation["status"] == "error" for validation in validations),
    }
    return {
        "documents_uploaded": len(documents),
        "processed_records": len(records),
        "verified_records": sum(record.get("verification_status") == "verified" for record in records),
        "needs_review": sum(record.get("verification_status") == "needs_review" for record in records),
        "pending_verification": sum(record.get("verification_status") == "pending" for record in records),
        "validation_issues": validation_overview["warnings"] + validation_overview["errors"],
        "validation_overview": validation_overview,
        "recent_records": recent_records,
    }


@router.get("/documents/{document_id}")
async def get_document_by_id(document_id: str):
    supabase = supabase_client()
    response = supabase.table("documents").select("*").eq("id", document_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")

    return response.data[0]


@router.post("/documents/{document_id}/ocr")
async def run_document_ocr(document_id: str):
    supabase = supabase_client()
    response = supabase.table("documents").select("filename, file_type, storage_path").eq("id", document_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = response.data[0]
    try:
        content = supabase.storage.from_("land-records").download(metadata["storage_path"])
    except Exception as error:
        raise HTTPException(status_code=404, detail=f"Storage file could not be fetched: {error}") from error

    try:
        result = process_document(content, metadata["filename"], metadata.get("file_type"))
    except OcrProcessingError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {error}") from error

    # Update document with detected language
    try:
        detected_lang_code = result.get("language_code", "unknown")
        supabase.table("documents").update({"language": detected_lang_code}).eq("id", document_id).execute()
    except Exception as error:
        # Log but don't fail if language update fails
        print(f"Warning: Could not update document language: {error}")

    return {
        "document_id": document_id,
        **result,
        "processing_status": "completed" if result["raw_text"] else "completed_empty",
    }


@router.post("/documents/{document_id}/extract")
async def extract_document_fields(document_id: str):
    supabase = supabase_client()
    response = supabase.table("documents").select("filename, file_type, storage_path").eq("id", document_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = response.data[0]
    try:
        content = supabase.storage.from_("land-records").download(metadata["storage_path"])
    except Exception as error:
        raise HTTPException(status_code=404, detail=f"Storage file could not be fetched: {error}") from error

    try:
        ocr_result = process_document(content, metadata["filename"], metadata.get("file_type"))
    except OcrProcessingError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {error}") from error

    extracted_record = extract_land_record(ocr_result["raw_text"])
    confidence = score_and_validate(extracted_record, ocr_result["raw_text"])
    try:
        land_record_id, confidence = persist_extraction(supabase, document_id, extracted_record, ocr_result["raw_text"])
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Structured record persistence failed: {error}") from error

    return {
        "document_id": document_id,
        "raw_text": ocr_result["raw_text"],
        "extracted_record": extracted_record,
        "land_record_id": land_record_id,
        **confidence,
    }


@router.post("/documents/{document_id}/validate")
async def validate_document(document_id: str):
    supabase = supabase_client()
    document_response = supabase.table("documents").select("filename, file_type, storage_path").eq("id", document_id).execute()
    if not document_response.data:
        raise HTTPException(status_code=404, detail="Document not found")

    metadata = document_response.data[0]
    try:
        content = supabase.storage.from_("land-records").download(metadata["storage_path"])
    except Exception as error:
        raise HTTPException(status_code=404, detail=f"Storage file could not be fetched: {error}") from error

    try:
        ocr_result = process_document(content, metadata["filename"], metadata.get("file_type"))
    except OcrProcessingError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {error}") from error

    extracted_record = extract_land_record(ocr_result["raw_text"])
    land_record_id, scored = persist_extraction(supabase, document_id, extracted_record, ocr_result["raw_text"])
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
    snapshot = get_verification_snapshot(supabase, document_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No persisted land record found for this document")
    return snapshot


@router.post("/documents/{document_id}/verify")
async def verify_document(document_id: str, request: VerifyRequest):
    supabase = supabase_client()
    snapshot = get_verification_snapshot(supabase, document_id)
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
        document_response = supabase.table("documents").select("filename, file_type, storage_path").eq("id", document_id).execute()
        if not document_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        metadata = document_response.data[0]
        content = supabase.storage.from_("land-records").download(metadata["storage_path"])
        ocr_result = process_document(content, metadata["filename"], metadata.get("file_type"))
        land_record_id, scored = persist_extraction(supabase, document_id, updated_record, ocr_result["raw_text"])
        for field, new_value in request.fields.items():
            old_value = land_record.get(field)
            if old_value != new_value:
                supabase.table("verification_actions").insert({
                    "land_record_id": land_record_id,
                    "user_id": None,
                    "action": "corrected",
                    "field_name": field,
                    "old_value": _as_text(old_value),
                    "new_value": _as_text(new_value),
                    "comment": request.comment,
                }).execute()
            else:
                supabase.table("verification_actions").insert({
                    "land_record_id": land_record_id,
                    "user_id": None,
                    "action": "verified",
                    "field_name": field,
                    "old_value": _as_text(old_value),
                    "new_value": _as_text(new_value),
                    "comment": request.comment,
                }).execute()

        core_complete = all(updated_record.get(field) is not None for field in ("owner_name", "survey_number", "khata_number", "area", "village", "tehsil", "district"))
        has_errors = any(result["status"] == "error" for result in scored["validation_results"])
        verified = core_complete and not has_errors
        status = "verified" if verified else "needs_review"
        supabase.table("land_records").update({"verification_status": status}).eq("id", land_record_id).execute()
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Verification persistence failed: {error}") from error

    return {
        "document_id": document_id,
        "land_record_id": land_record_id,
        "land_record": {field: updated_record.get(field) for field in CANONICAL_FIELDS},
        "field_confidence": scored["field_confidence"],
        "overall_confidence": scored["overall_confidence"],
        "validation_results": scored["validation_results"],
        "review_required": scored["review_required"],
        "verification_status": status,
        "verification_actions": get_verification_snapshot(supabase, document_id)["verification_actions"],
    }


@router.get("/documents/{document_id}/preview")
async def preview_document(document_id: str):
    """
    Secure document preview endpoint.
    Downloads the document from private Supabase Storage and returns it with proper headers.
    Does not expose service-role credentials.
    """
    supabase = supabase_client()
    
    # Fetch document metadata
    response = supabase.table("documents").select("filename, file_type, storage_path").eq("id", document_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Document not found")
    
    metadata = response.data[0]
    storage_path = metadata["storage_path"]
    filename = metadata["filename"]
    file_type = metadata.get("file_type", "application/octet-stream")
    
    # Download from private storage
    try:
        content = supabase.storage.from_("land-records").download(storage_path)
    except Exception as error:
        raise HTTPException(status_code=404, detail=f"Document file could not be retrieved: {error}") from error
    
    # Return with appropriate headers
    return Response(
        content=content,
        media_type=file_type,
        headers={
            "Content-Disposition": f"inline; filename={filename}",
            "Cache-Control": "private, max-age=3600",
        }
    )


def _as_text(value: object) -> str | None:
    return None if value is None else str(value)
