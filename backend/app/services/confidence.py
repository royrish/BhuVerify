import re

from app.services.extraction import CANONICAL_FIELDS, LABELS, normalize_ocr_text

CORE_FIELDS = (
    "owner_name",
    "survey_number",
    "khata_number",
    "area",
    "village",
    "tehsil",
    "district",
)
TEXT_FIELDS = {
    "owner_name",
    "village",
    "tehsil",
    "district",
    "land_classification",
    "ownership_details",
    "mutation_information",
    "registration_information",
}
ALLOWED_UNITS = {
    "acre",
    "acres",
    "hectare",
    "hectares",
    "cent",
    "cents",
    "sq.ft",
    "sq.m",
    "square feet",
    "square meter",
}


def _label_found(normalized_text: str, labels: tuple[str, ...]) -> bool:
    lines = normalized_text.splitlines()
    pattern = re.compile(rf"^\s*(?:{'|'.join(re.escape(label) for label in labels)})\b", re.IGNORECASE)
    return any(pattern.search(line) for line in lines)


def _suspicious(value: str) -> bool:
    return bool(re.search(r"[\x00-\x1f\[\]{}<>~^|]", value))


def _text_valid(value: object) -> bool:
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > 200:
        return False
    letters = sum(character.isalpha() for character in value)
    return letters / max(len(value), 1) >= 0.35


def _nonempty_text(value: object) -> bool:
    return isinstance(value, str) and 0 < len(value.strip()) <= 200 and any(character.isalpha() for character in value)


def _identifier_valid(value: object) -> bool:
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9./-]*", value.strip()))


def _unit_valid(value: object) -> bool:
    if not isinstance(value, str):
        return False
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    return normalized in ALLOWED_UNITS


def _validation(field_name: str, validation_type: str, severity: str, status: str, message: str) -> dict[str, str]:
    return {
        "field_name": field_name,
        "validation_type": validation_type,
        "severity": severity,
        "status": status,
        "message": message,
    }


def _field_result(field_name: str, value: object, normalized_text: str) -> tuple[int, list[dict[str, str]]]:
    if value is None or value == "":
        missing_severity = "error" if field_name == "area" else "warning"
        return 0, [_validation(field_name, "presence", missing_severity, "error" if missing_severity == "error" else "warning", f"{field_name.replace('_', ' ').title()} is missing.")]

    score = 60
    results = []
    labels_found = _label_found(normalized_text, LABELS[field_name])
    if labels_found:
        score += 10
    else:
        score -= 15
        results.append(_validation(field_name, "label", "warning", "warning", "Field label was not clearly found near the extracted value."))

    valid = True
    message = "Value format is valid."
    if field_name in {"mutation_information", "registration_information"}:
        valid = _nonempty_text(value)
        message = "Reference information is present."
    elif field_name in TEXT_FIELDS:
        valid = _text_valid(value)
        message = "Text value is valid."
    elif field_name in {"survey_number", "khata_number"}:
        valid = _identifier_valid(value)
        message = "Identifier format is valid."
    elif field_name == "area":
        valid = isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0
        message = "Area is a valid positive numeric value."
    elif field_name == "area_unit":
        valid = _unit_valid(value)
        message = "Area unit is recognized."

    if valid:
        score += 20
        results.append(_validation(field_name, "format", "info", "pass", message))
    else:
        score -= 25
        results.append(_validation(field_name, "format", "error", "error", f"{field_name.replace('_', ' ').title()} format is invalid."))

    if isinstance(value, str) and _suspicious(value):
        score -= 20
        results.append(_validation(field_name, "ocr_quality", "warning", "warning", "Value contains unusual OCR characters."))
    else:
        score += 5

    return max(0, min(98, score)), results


def score_and_validate(record: dict[str, object], raw_text: str) -> dict[str, object]:
    normalized_text = normalize_ocr_text(raw_text)
    field_confidence = {}
    validation_results = []

    for field_name in CANONICAL_FIELDS:
        score, results = _field_result(field_name, record.get(field_name), normalized_text)
        field_confidence[field_name] = score
        validation_results.extend(results)

    area = record.get("area")
    area_unit = record.get("area_unit")
    if area is not None and area_unit is None:
        validation_results.append(_validation("area_unit", "cross_field", "warning", "warning", "Area unit is missing."))
    if area is not None and (not isinstance(area, (int, float)) or isinstance(area, bool) or area <= 0):
        validation_results.append(_validation("area", "cross_field", "error", "error", "Area must be greater than zero."))

    weighted_total = sum(field_confidence[field] * 0.1 for field in CORE_FIELDS)
    weighted_total += sum(field_confidence[field] * (0.3 / (len(CANONICAL_FIELDS) - len(CORE_FIELDS))) for field in CANONICAL_FIELDS if field not in CORE_FIELDS)
    overall_confidence = round(weighted_total)

    error_count = sum(result["status"] == "error" for result in validation_results)
    warning_count = sum(result["status"] == "warning" for result in validation_results)
    review_required = (
        overall_confidence < 85
        or error_count > 0
        or any(record.get(field) is None for field in CORE_FIELDS)
        or warning_count >= 3
    )

    return {
        "field_confidence": field_confidence,
        "overall_confidence": overall_confidence,
        "validation_results": validation_results,
        "review_required": review_required,
    }
