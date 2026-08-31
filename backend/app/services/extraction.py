import re

CANONICAL_FIELDS = (
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
)

# Multilingual labels supporting English and Tamil
LABELS = {
    "owner_name": (
        "Owner Name",
        "உரிமையாளர் பெயர்",  # Tamil: Owner Name
    ),
    "survey_number": (
        "Survey Number",
        "சர்வே எண்",  # Tamil: Survey Number
    ),
    "khata_number": (
        "Khata Number",
        "காத்தா எண்",  # Tamil: Khata Number
    ),
    "area": (
        "Land Area",
        "நிலப்பரப்பு",  # Tamil: Land Area
    ),
    "area_unit": (
        "Area Unit",
        "பரப்பு அலகு",  # Tamil: Area Unit
    ),
    "village": (
        "Village",
        "கிராமம்",  # Tamil: Village
    ),
    "tehsil": (
        "Tehsil",
        "வட்டம்",  # Tamil: Tehsil
    ),
    "district": (
        "District",
        "மாவட்டம்",  # Tamil: District
    ),
    "land_classification": (
        "Land Classification",
        "Land Class",
        "நில வகைப்பாடு",  # Tamil: Land Classification
    ),
    "ownership_details": (
        "Ownership Details",
        "Ownership",
        "உரிமை விவரங்கள்",  # Tamil: Ownership Details
    ),
    "mutation_information": (
        "Mutation Information",
        "Mutation No",
        "மாற்றம் தகவல்",  # Tamil: Mutation Information
    ),
    "registration_information": (
        "Registration Information",
        "Registration",
        "பதிவு தகவல்",  # Tamil: Registration Information
    ),
}

ALL_LABELS = tuple(label for labels in LABELS.values() for label in labels)
OMISSION_NOTE = re.compile(r"\b(?:intentionally|deliberately|not|no|missing|omitted|unavailable)\b", re.IGNORECASE)


def normalize_ocr_text(raw_text: str) -> str:
    lines = []
    for line in raw_text.splitlines():
        normalized = re.sub(r"\s+", " ", line).strip()
        if normalized:
            lines.append(normalized)
    return "\n".join(lines)


def _value_for_labels(lines: list[str], labels: tuple[str, ...]) -> str | None:
    alternatives = "|".join(re.escape(label) for label in labels)
    pattern = re.compile(rf"^\s*(?:{alternatives})\s*(?::|-)?\s*(.*?)\s*$", re.IGNORECASE)
    label_pattern = re.compile(rf"^\s*(?:{'|'.join(re.escape(label) for label in ALL_LABELS)})\s*(?::|-)?\s*$", re.IGNORECASE)
    for index, line in enumerate(lines):
        match = pattern.match(line)
        if not match:
            continue
        value = match.group(1).strip()
        if value and not OMISSION_NOTE.search(value):
            return value
        if index + 1 < len(lines):
            next_line = lines[index + 1].strip()
            if next_line and not label_pattern.match(next_line) and not OMISSION_NOTE.search(next_line):
                return next_line
    return None


def extract_land_record(raw_text: str) -> dict[str, str | float | None]:
    normalized_text = normalize_ocr_text(raw_text)
    lines = normalized_text.splitlines()
    record: dict[str, str | float | None] = {field: None for field in CANONICAL_FIELDS}

    for field, labels in LABELS.items():
        value = _value_for_labels(lines, labels)
        if value is None:
            continue
        if field == "area":
            area_match = re.search(r"\d+(?:\.\d+)?", value)
            record[field] = float(area_match.group(0)) if area_match else None
        else:
            record[field] = value

    return record
