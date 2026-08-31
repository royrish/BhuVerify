from typing import Any

from app.services.confidence import score_and_validate
from app.services.extraction import CANONICAL_FIELDS
from app.services.reference_validation import detect_duplicate_records, run_cross_record_validation


def _as_text(value: Any) -> str | None:
    if value is None:
        return None
    return str(value)


def persist_extraction(supabase, document_id: str, record: dict[str, Any], raw_text: str):
    scored = score_and_validate(record, raw_text)
    verification_status = "needs_review" if scored["review_required"] else "pending"
    existing = supabase.table("land_records").select("id").eq("document_id", document_id).execute()

    if existing.data:
        land_record_id = existing.data[0]["id"]
        supabase.table("land_records").update({
            **record,
            "overall_confidence": scored["overall_confidence"],
            "validation_status": "needs_review" if scored["review_required"] else "passed",
            "verification_status": verification_status,
        }).eq("id", land_record_id).execute()
    else:
        response = supabase.table("land_records").insert({
            "document_id": document_id,
            **record,
            "overall_confidence": scored["overall_confidence"],
            "validation_status": "needs_review" if scored["review_required"] else "passed",
            "verification_status": verification_status,
        }).execute()
        land_record_id = response.data[0]["id"]

    reference_records = supabase.table("land_records").select("*").execute().data or []
    reference_records = [item for item in reference_records if item.get("id") != land_record_id]
    duplicate_summary = detect_duplicate_records(record, reference_records)
    cross_validation_results = run_cross_record_validation(record, reference_records)
    scored["duplicate_detected"] = duplicate_summary["duplicate_detected"]
    scored["duplicate_score"] = duplicate_summary["duplicate_score"]
    scored["matches"] = duplicate_summary["matches"]
    if duplicate_summary["duplicate_detected"]:
        scored["review_required"] = True
        verification_status = "needs_review"
    scored["validation_results"] = [*scored["validation_results"], *cross_validation_results]

    supabase.table("land_records").update({
        **record,
        "overall_confidence": scored["overall_confidence"],
        "validation_status": "needs_review" if scored["review_required"] else "passed",
        "verification_status": verification_status,
    }).eq("id", land_record_id).execute()

    supabase.table("extracted_fields").delete().eq("land_record_id", land_record_id).execute()
    supabase.table("extracted_fields").insert([
        {
            "land_record_id": land_record_id,
            "field_name": field,
            "extracted_value": _as_text(record.get(field)),
            "confidence": scored["field_confidence"][field],
            "verification_status": "pending" if scored["field_confidence"][field] < 85 or record.get(field) is None else "verified",
        }
        for field in CANONICAL_FIELDS
    ]).execute()

    supabase.table("validation_results").delete().eq("land_record_id", land_record_id).execute()
    validation_rows = [
        {
            "land_record_id": land_record_id,
            "validation_type": result["validation_type"],
            "field_name": result["field_name"],
            "severity": result["severity"],
            "expected_value": _as_text(result.get("expected_value")),
            "actual_value": _as_text(result.get("actual_value")),
            "message": result["message"],
            "status": result["status"],
        }
        for result in scored["validation_results"]
    ]
    if validation_rows:
        supabase.table("validation_results").insert(validation_rows).execute()

    return land_record_id, scored


def get_verification_snapshot(supabase, document_id: str):
    record_response = supabase.table("land_records").select("*").eq("document_id", document_id).execute()
    if not record_response.data:
        return None
    land_record = record_response.data[0]
    land_record_id = land_record["id"]
    fields = supabase.table("extracted_fields").select("*").eq("land_record_id", land_record_id).execute()
    validations = supabase.table("validation_results").select("*").eq("land_record_id", land_record_id).execute()
    actions = supabase.table("verification_actions").select("*").eq("land_record_id", land_record_id).order("timestamp", desc=True).execute()
    return {
        "land_record": land_record,
        "extracted_fields": fields.data or [],
        "validation_results": validations.data or [],
        "verification_actions": actions.data or [],
    }
