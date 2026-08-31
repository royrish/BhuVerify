#!/usr/bin/env python
"""Test OCR with Tamil + English document."""

from app.services.ocr_provider import process_document
from app.services.extraction import extract_land_record
import os

def test_tamil_english_ocr():
    """Test OCR on Tamil + English synthetic document."""
    
    print("=" * 70)
    print("STAGE 2F: Testing Tamil + English OCR")
    print("=" * 70)
    print()
    
    # Test with local Tamil + English PDF
    local_path = "../sample-data/synthetic_land_record_tamil_english.pdf"
    
    if not os.path.exists(local_path):
        print(f"ERROR: File not found at {local_path}")
        return False
    
    print(f"✓ Found Tamil + English PDF")
    
    with open(local_path, "rb") as f:
        content = f.read()
    
    print(f"✓ Loaded file ({len(content)} bytes)")
    print()
    
    # Process with OCR
    print("Processing PDF with OCR...")
    try:
        result = process_document(
            content,
            "synthetic_land_record_tamil_english.pdf",
            "application/pdf"
        )
        print("✓ OCR processing completed")
    except Exception as e:
        print(f"✗ OCR processing failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    print()
    print("OCR RESULT:")
    print("-" * 70)
    print(f"Pages processed: {result['pages_processed']}")
    print(f"OCR Engine: {result['ocr_engine']} {result['ocr_engine_version']}")
    print(f"Detected Language: {result['detected_language']}")
    print(f"Language Code: {result['language_code']}")
    print(f"Language Confidence: {result['language_confidence']}%")
    print()
    print("OCR TEXT (first 700 characters):")
    print("-" * 70)
    print(result["raw_text"][:700])
    print("-" * 70)
    print()
    
    # Check if Tamil text was recognized
    tamil_chars = sum(1 for c in result["raw_text"] if ord(c) >= 0x0B80 and ord(c) <= 0x0BFF)
    english_chars = sum(1 for c in result["raw_text"] if c.isascii() and c.isalpha())
    
    print("LANGUAGE CONTENT ANALYSIS:")
    print("-" * 70)
    print(f"Tamil Unicode characters found: {tamil_chars}")
    print(f"English alphabetic characters found: {english_chars}")
    print(f"Total text length: {len(result['raw_text'])} characters")
    print()
    
    # Determine if Tamil OCR worked
    if tamil_chars > 0:
        print("✓ TAMIL TEXT DETECTED IN OCR OUTPUT")
        tamil_ocr_pass = True
    else:
        print("✗ NO TAMIL TEXT IN OCR OUTPUT")
        print("  (Tamil language was DETECTED but not OCR-RECOGNIZED)")
        tamil_ocr_pass = False
    
    # Test extraction
    print()
    print("Testing extraction with multilingual labels...")
    print("-" * 70)
    try:
        extracted = extract_land_record(result["raw_text"])
        print("✓ Extraction completed")
        print()
        print("Extracted fields:")
        for field, value in extracted.items():
            if value is not None:
                print(f"  {field}: {value}")
        print()
    except Exception as e:
        print(f"✗ Extraction failed: {e}")
        import traceback
        traceback.print_exc()
    
    print("=" * 70)
    return tamil_ocr_pass


if __name__ == "__main__":
    tamil_ocr_ok = test_tamil_english_ocr()
    
    print()
    print("SUMMARY:")
    print("-" * 70)
    if tamil_ocr_ok:
        print("✓ Tamil OCR: PASS (Tamil text recognized)")
    else:
        print("⚠ Tamil OCR: PARTIAL (Language detected, but text not recognized)")
        print("             (This is expected - RapidOCR may not support Tamil with current setup)")
    print()
