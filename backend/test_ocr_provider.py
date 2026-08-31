#!/usr/bin/env python
"""Test OCR provider with existing test documents."""

from app.services.ocr_provider import process_document
from app.config import supabase_client
import os

# Test with existing synthetic English document
def test_english_ocr():
    print("=" * 60)
    print("Testing English OCR (synthetic_land_record.pdf)")
    print("=" * 60)
    
    supabase = supabase_client()
    
    # Get the document from storage
    try:
        # The document ID for the good synthetic document
        storage_path = "f4f05840-9627-4608-8103-75647e7f150e/synthetic_land_record.pdf"
        
        try:
            content = supabase.storage.from_("land-records").download(storage_path)
            print(f"✓ Downloaded document from storage")
            
            result = process_document(content, "synthetic_land_record.pdf", "application/pdf")
            
            print(f"\nOCR Result:")
            print(f"  Pages processed: {result['pages_processed']}")
            print(f"  OCR Engine: {result['ocr_engine']} {result['ocr_engine_version']}")
            print(f"  Detected Language: {result['detected_language']}")
            print(f"  Language Code: {result['language_code']}")
            print(f"  Language Confidence: {result['language_confidence']}%")
            print(f"  Raw text length: {len(result['raw_text'])} characters")
            print(f"\n  First 500 characters of OCR text:")
            print(f"  {result['raw_text'][:500]}")
            print()
            
            return result
            
        except Exception as e:
            print(f"✗ Could not download document: {e}")
            print("  (This is expected if the test documents haven't been uploaded yet)")
            print("  Skipping this test.")
            return None
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return None


def test_tamil_english_ocr():
    print("=" * 60)
    print("Testing Tamil + English OCR (synthetic_land_record_tamil_english.pdf)")
    print("=" * 60)
    
    # Try to load the local file if it exists
    local_path = "sample-data/synthetic_land_record_tamil_english.pdf"
    
    if os.path.exists(local_path):
        print(f"✓ Found local file at {local_path}")
        
        with open(local_path, "rb") as f:
            content = f.read()
        
        try:
            result = process_document(
                content,
                "synthetic_land_record_tamil_english.pdf",
                "application/pdf"
            )
            
            print(f"\nOCR Result:")
            print(f"  Pages processed: {result['pages_processed']}")
            print(f"  OCR Engine: {result['ocr_engine']} {result['ocr_engine_version']}")
            print(f"  Detected Language: {result['detected_language']}")
            print(f"  Language Code: {result['language_code']}")
            print(f"  Language Confidence: {result['language_confidence']}%")
            print(f"  Raw text length: {len(result['raw_text'])} characters")
            print(f"\n  First 500 characters of OCR text:")
            print(f"  {result['raw_text'][:500]}")
            print()
            
            return result
            
        except Exception as e:
            print(f"✗ OCR processing failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    else:
        print(f"✗ Local file not found at {local_path}")
        print("  Please ensure the Tamil test document has been generated.")
        return None


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("Stage 2F - OCR Provider Tests")
    print("=" * 60 + "\n")
    
    # Test English OCR
    english_result = test_english_ocr()
    
    # Test Tamil + English OCR
    tamil_english_result = test_tamil_english_ocr()
    
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    if english_result:
        print(f"✓ English OCR test completed")
    else:
        print(f"⚠ English OCR test skipped or failed (documents not yet uploaded)")
    
    if tamil_english_result:
        print(f"✓ Tamil + English OCR test completed")
    else:
        print(f"✗ Tamil + English OCR test failed")
    
    print()
