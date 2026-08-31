from __future__ import annotations

from typing import Any


def _normalize_text(value: Any) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized.lower() if normalized else None


def _as_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _same_value(left: Any, right: Any) -> bool:
    left_norm = _normalize_text(left)
    right_norm = _normalize_text(right)
    if left_norm is None or right_norm is None:
        return False
    return left_norm == right_norm


def _calculate_duplicate_score(current: dict[str, Any], reference: dict[str, Any]) -> tuple[int, list[str]]:
    score = 0
    matched_fields: list[str] = []

    same_survey = _same_value(current.get("survey_number"), reference.get("survey_number"))
    same_village = _same_value(current.get("village"), reference.get("village"))
    same_district = _same_value(current.get("district"), reference.get("district"))
    same_khata = _same_value(current.get("khata_number"), reference.get("khata_number"))
    same_registration = _same_value(current.get("registration_information"), reference.get("registration_information"))
    same_mutation = _same_value(current.get("mutation_information"), reference.get("mutation_information"))

    if same_survey and same_village and same_district:
        score += 60
        matched_fields.extend(["survey_number", "village", "district"])
    elif same_survey and same_village:
        score += 45
        matched_fields.extend(["survey_number", "village"])
    elif same_village and same_district:
        score += 20
        matched_fields.extend(["village", "district"])

    if same_khata and same_village and same_district:
        score += 30
        matched_fields.extend(["khata_number", "village", "district"])
    elif same_khata and same_village:
        score += 18
        matched_fields.extend(["khata_number", "village"])

    if same_registration:
        score += 25
        matched_fields.append("registration_information")

    if same_mutation:
        score += 18
        matched_fields.append("mutation_information")

    if same_survey:
        score += 10
    if same_khata:
        score += 8
    if same_village:
        score += 6
    if same_district:
        score += 6

    # Owner-only matches are weak evidence and must not trigger a duplicate verdict by themselves.
    if _same_value(current.get("owner_name"), reference.get("owner_name")) and not same_survey and not same_khata and not same_registration and not same_mutation:
        score += 4

    current_area = _as_float(current.get("area"))
    reference_area = _as_float(reference.get("area"))
    if current_area is not None and reference_area is not None and same_survey and same_village and same_district:
        delta = abs(current_area - reference_area)
        if delta > 0.5:
            score -= 8

    # Remove duplicates while keeping field order meaningful.
    ordered_fields: list[str] = []
    for field in ["survey_number", "village", "district", "khata_number", "registration_information", "mutation_information"]:
        if field in matched_fields and field not in ordered_fields:
            ordered_fields.append(field)

    return min(100, max(0, score)), ordered_fields


def detect_duplicate_records(current_record: dict[str, Any], reference_records: list[dict[str, Any]]) -> dict[str, Any]:
    candidates: list[dict[str, Any]] = []

    for reference in reference_records:
        if not isinstance(reference, dict):
            continue
        if current_record.get("id") and reference.get("id") == current_record.get("id"):
            continue

        score, matched_fields = _calculate_duplicate_score(current_record, reference)
        if score >= 70:
            candidates.append({
                "land_record_id": reference.get("id"),
                "matched_fields": matched_fields,
                "score": score,
            })

    matches = sorted(candidates, key=lambda item: item["score"], reverse=True)
    duplicate_score = matches[0]["score"] if matches else 0

    return {
        "duplicate_detected": bool(matches),
        "duplicate_score": duplicate_score,
        "matches": matches,
    }


def _parcel_matches(current_record: dict[str, Any], reference: dict[str, Any]) -> bool:
    return (
        _same_value(current_record.get("survey_number"), reference.get("survey_number"))
        and _same_value(current_record.get("village"), reference.get("village"))
        and _same_value(current_record.get("district"), reference.get("district"))
    )


def run_cross_record_validation(current_record: dict[str, Any], reference_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    validation_results: list[dict[str, Any]] = []
    duplicate_report = detect_duplicate_records(current_record, reference_records)

    for match in duplicate_report["matches"]:
        reference = next((entry for entry in reference_records if entry.get("id") == match["land_record_id"]), None)
        if reference is None:
            continue

        parcel_match = _parcel_matches(current_record, reference)
        if parcel_match and "survey_number" in match["matched_fields"]:
            severity = "error" if match["score"] >= 90 else "warning"
            validation_results.append({
                "field_name": "survey_number",
                "validation_type": "duplicate_check",
                "severity": severity,
                "status": severity,
                "message": "Possible duplicate land record found for the same survey number, village and district.",
                "expected_value": None,
                "actual_value": current_record.get("survey_number"),
            })

        if "registration_information" in match["matched_fields"]:
            validation_results.append({
                "field_name": "registration_information",
                "validation_type": "duplicate_check",
                "severity": "warning",
                "status": "warning",
                "message": "Possible duplicate registration record detected.",
                "expected_value": None,
                "actual_value": current_record.get("registration_information"),
            })

        if "mutation_information" in match["matched_fields"]:
            validation_results.append({
                "field_name": "mutation_information",
                "validation_type": "duplicate_check",
                "severity": "warning",
                "status": "warning",
                "message": "Possible duplicate mutation record detected.",
                "expected_value": None,
                "actual_value": current_record.get("mutation_information"),
            })

        if parcel_match:
            current_area = _as_float(current_record.get("area"))
            reference_area = _as_float(reference.get("area"))
            if current_area is not None and reference_area is not None and abs(current_area - reference_area) > 0.25:
                validation_results.append({
                    "field_name": "area",
                    "validation_type": "duplicate_check",
                    "severity": "warning",
                    "status": "warning",
                    "message": "Area mismatch detected between records.",
                    "expected_value": reference_area,
                    "actual_value": current_area,
                })

            current_class = _normalize_text(current_record.get("land_classification"))
            reference_class = _normalize_text(reference.get("land_classification"))
            if current_class and reference_class and current_class != reference_class:
                validation_results.append({
                    "field_name": "land_classification",
                    "validation_type": "duplicate_check",
                    "severity": "warning",
                    "status": "warning",
                    "message": "Land classification mismatch detected.",
                    "expected_value": reference.get("land_classification"),
                    "actual_value": current_record.get("land_classification"),
                })

    return validation_results
