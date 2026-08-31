from app.services.reference_validation import detect_duplicate_records, run_cross_record_validation


def test_duplicate_detection_detects_same_survey_and_area_conflict():
    current = {
        "survey_number": "142/3A",
        "village": "Kelambakkam",
        "district": "Chengalpattu",
        "khata_number": "782",
        "area": 2.45,
        "area_unit": "Acres",
        "land_classification": "Agricultural",
        "registration_information": "REG/2019/4421",
        "mutation_information": "MUT/2024/0182",
    }

    reference_records = [{
        "id": "ref-1",
        "survey_number": "142/3A",
        "village": "Kelambakkam",
        "district": "Chengalpattu",
        "khata_number": "782",
        "area": 3.10,
        "area_unit": "Acres",
        "land_classification": "Agricultural",
        "registration_information": "REG/2019/4421",
        "mutation_information": "MUT/2024/0182",
    }]

    result = detect_duplicate_records(current, reference_records)
    assert result["duplicate_detected"] is True
    assert result["duplicate_score"] >= 80
    assert any("survey_number" in match["matched_fields"] for match in result["matches"])

    validation = run_cross_record_validation(current, reference_records)
    assert any(item["validation_type"] == "duplicate_check" for item in validation)
    assert any("Area mismatch" in item["message"] for item in validation if item["validation_type"] == "duplicate_check")


def test_duplicate_detection_ignores_owner_only_match():
    current = {
        "owner_name": "Ramesh Kumar",
        "survey_number": "912/4B",
        "village": "Tambaram",
        "district": "Chengalpattu",
    }

    reference_records = [{
        "id": "ref-2",
        "owner_name": "Ramesh Kumar",
        "survey_number": "912/4B",
        "village": "Tambaram",
        "district": "Chengalpattu",
    }]

    result = detect_duplicate_records(current, reference_records)
    assert result["duplicate_score"] >= 70


if __name__ == "__main__":
    test_duplicate_detection_detects_same_survey_and_area_conflict()
    test_duplicate_detection_ignores_owner_only_match()
    print("STAGE 2G duplicate validation tests passed")
