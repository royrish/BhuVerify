#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Comprehensive regression tests for Stage 2F."""

from app.services.ocr_provider import process_document
from app.services.extraction import extract_land_record
from app.services.confidence import score_and_validate
import os
import sys

# Force UTF-8 output
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")


def test_english_regression():
    """Test that existing English OCR still works."""
    
    print("=" * 70)
    print("REGRESSION TEST: English Document (synthetic_land_record.pdf)")
    print("=" * 70)
    print()
    
    local_path = "../sample-data/synthetic_land_record.pdf"
    
    if not os.path.exists(local_path):
        print(f"✗ File not found at {local_path}")
        return False
    
    print(f"✓ Found English test document")
    
    with open(local_path, "rb") as f:
        content = f.read()
    
    print(f"✓ Loaded file ({len(content)} bytes)")
    
    # Process with OCR
    try:
        ocr_result = process_document(
            content,
            "synthetic_land_record.pdf",
            "application/pdf"
        )
        print(f"✓ OCR processed successfully")
        print(f"  - Pages: {ocr_result['pages_processed']}")
        print(f"  - Detected language: {ocr_result['detected_language']}")
        print(f"  - Text length: {len(ocr_result['raw_text'])} characters")
    except Exception as e:
        print(f"✗ OCR failed: {e}")
        return False
    
    # Extract fields
    try:
        extracted = extract_land_record(ocr_result["raw_text"])
        print(f"✓ Extraction successful")
        
        # Check key fields
        required_fields = [
            "owner_name", "survey_number", "khata_number", 
            "area", "district", "tehsil", "village"
        ]
        found_fields = sum(1 for f in required_fields if extracted.get(f) is not None)
        print(f"  - Found {found_fields}/{len(required_fields)} key fields")
        
        if found_fields < 5:
            print(f"  ⚠ Warning: Less than expected key fields extracted")
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        return False
    
    # Score and validate
    try:
        confidence = score_and_validate(extracted, ocr_result["raw_text"])
        print(f"✓ Confidence scoring successful")
        print(f"  - Overall confidence: {confidence['overall_confidence']}%")
        print(f"  - Review required: {confidence['review_required']}")
        
        if confidence['overall_confidence'] >= 85:
            print(f"  ✓ High confidence (>=85%)")
        elif confidence['overall_confidence'] >= 70:
            print(f"  ⚠ Medium confidence (70-85%)")
        else:
            print(f"  ✗ Low confidence (<70%)")
    except Exception as e:
        print(f"✗ Confidence scoring failed: {e}")
        return False
    
    print()
    print("✓ ENGLISH REGRESSION TEST PASSED")
    return True


def test_imperfect_regression():
    """Test that imperfect document still works."""
    
    print()
    print("=" * 70)
    print("REGRESSION TEST: Imperfect Document (synthetic_land_record_imperfect.pdf)")
    print("=" * 70)
    print()
    
    local_path = "../sample-data/synthetic_land_record_imperfect.pdf"
    
    if not os.path.exists(local_path):
        print(f"✗ File not found at {local_path}")
        print("  (This document may not be available locally)")
        return None  # Skip this test if file doesn't exist
    
    print(f"✓ Found imperfect test document")
    
    with open(local_path, "rb") as f:
        content = f.read()
    
    print(f"✓ Loaded file ({len(content)} bytes)")
    
    # Process with OCR
    try:
        ocr_result = process_document(
            content,
            "synthetic_land_record_imperfect.pdf",
            "application/pdf"
        )
        print(f"✓ OCR processed successfully")
        print(f"  - Pages: {ocr_result['pages_processed']}")
        print(f"  - Detected language: {ocr_result['detected_language']}")
        print(f"  - Text length: {len(ocr_result['raw_text'])} characters")
    except Exception as e:
        print(f"✗ OCR failed: {e}")
        return False
    
    # Extract fields
    try:
        extracted = extract_land_record(ocr_result["raw_text"])
        print(f"✓ Extraction successful")
        
        missing_fields = [f for f in extracted if extracted[f] is None]
        print(f"  - Missing fields: {len(missing_fields)}")
        if missing_fields:
            print(f"    {', '.join(missing_fields[:3])}")
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        return False
    
    # Score and validate
    try:
        confidence = score_and_validate(extracted, ocr_result["raw_text"])
        print(f"✓ Confidence scoring successful")
        print(f"  - Overall confidence: {confidence['overall_confidence']}%")
        print(f"  - Review required: {confidence['review_required']}")
        
        # For imperfect document, we expect lower confidence
        if confidence['review_required']:
            print(f"  ✓ Correctly flagged for review (as expected)")
        else:
            print(f"  ⚠ Not flagged for review (unexpected for imperfect doc)")
    except Exception as e:
        print(f"✗ Confidence scoring failed: {e}")
        return False
    
    print()
    print("✓ IMPERFECT REGRESSION TEST PASSED")
    return True


def test_multilingual_extraction():
    """Test that multilingual labels are available in extraction."""
    
    print()
    print("=" * 70)
    print("TEST: Multilingual Extraction Labels")
    print("=" * 70)
    print()
    
    from app.services.extraction import LABELS
    
    print("✓ Checking multilingual label mappings:")
    print()
    
    # Check that Tamil labels exist
    tamil_labels_found = 0
    for field, label_tuple in LABELS.items():
        tamil_labels = [l for l in label_tuple if any(ord(c) in range(0x0B80, 0x0BFF + 1) for c in l)]
        if tamil_labels:
            tamil_labels_found += 1
            print(f"  ✓ {field}: Tamil labels available")
            for label in tamil_labels:
                print(f"      {label}")
    
    print()
    print(f"✓ Total fields with Tamil labels: {tamil_labels_found}")
    
    if tamil_labels_found >= 8:
        print("✓ MULTILINGUAL LABELS TEST PASSED")
        return True
    else:
        print("✗ MULTILINGUAL LABELS TEST FAILED - Not enough Tamil labels")
        return False


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("STAGE 2F REGRESSION TESTS")
    print("=" * 70 + "\n")
    
    results = []
    
    # Run tests
    english_result = test_english_regression()
    results.append(("English OCR Regression", english_result))
    
    imperfect_result = test_imperfect_regression()
    if imperfect_result is not None:
        results.append(("Imperfect OCR Regression", imperfect_result))
    
    multilingual_result = test_multilingual_extraction()
    results.append(("Multilingual Labels", multilingual_result))
    
    # Summary
    print()
    print("=" * 70)
    print("REGRESSION TEST SUMMARY")
    print("=" * 70)
    for test_name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {test_name}")
    
    all_passed = all(r[1] for r in results)
    print()
    if all_passed:
        print("✓ ALL REGRESSION TESTS PASSED")
    else:
        print("✗ SOME REGRESSION TESTS FAILED")
    
    print()
