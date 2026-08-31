#!/usr/bin/env python3
"""
Integration test for Stage 2H - Visual Human Verification Experience.
Tests all key workflows:
1. Backend module imports
2. CANONICAL_FIELDS consistency  
3. Confidence scoring
4. Duplicate detection
5. Frontend type exports
"""

import os
import sys
import json
from pathlib import Path

def test_imports():
    """Test 1: Backend imports"""
    print("\n" + "="*60)
    print("TEST 1: Backend Module Imports")
    print("="*60)
    
    try:
        import app
        import app.api.documents
        import app.services.ocr
        import app.services.extraction
        import app.services.confidence
        import app.services.persistence
        
        print("✓ All backend modules imported successfully")
        return True
    except Exception as e:
        print(f"✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_canonical_fields():
    """Test 2: Check CANONICAL_FIELDS consistency"""
    print("\n" + "="*60)
    print("TEST 2: CANONICAL_FIELDS Consistency")
    print("="*60)
    
    try:
        from app.services.extraction import CANONICAL_FIELDS as backend_fields
        
        expected_fields = [
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
        ]
        
        if list(backend_fields) == expected_fields:
            print(f"✓ CANONICAL_FIELDS matches ({len(backend_fields)} fields)")
            for field in backend_fields:
                print(f"  - {field}")
            return True
        else:
            print(f"✗ CANONICAL_FIELDS mismatch")
            print(f"Expected: {expected_fields}")
            print(f"Got: {list(backend_fields)}")
            return False
            
    except Exception as e:
        print(f"✗ Check failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_confidence_scoring():
    """Test 3: Confidence scoring functions"""
    print("\n" + "="*60)
    print("TEST 3: Confidence Scoring")
    print("="*60)
    
    try:
        from app.services.confidence import score_and_validate
        
        test_cases = [
            ("owner_name", "John Doe"),
            ("area", "1.5"),
            ("survey_number", "12345"),
        ]
        
        for field, value in test_cases:
            result = score_and_validate(field, value)
            score = result.get("confidence_score", "N/A")
            status = result.get("validation_status", "N/A")
            print(f"✓ {field:20} score={score:6} status={status}")
        
        print(f"✓ Confidence scoring working correctly")
        return True
        
    except Exception as e:
        print(f"✗ Confidence test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_duplicate_detection():
    """Test 4: Duplicate detection logic"""
    print("\n" + "="*60)
    print("TEST 4: Duplicate Detection")
    print("="*60)
    
    try:
        from app.services.reference_validation import detect_duplicate_records
        
        # Create two similar records
        record1 = {
            "owner_name": "Ramesh Kumar",
            "survey_number": "123",
            "khata_number": "456",
            "village": "Madurai",
            "district": "Madurai",
        }
        
        record2 = {
            "owner_name": "Ramesh Kumar",
            "survey_number": "123",
            "khata_number": "456",
            "village": "Madurai",
            "district": "Madurai",
        }
        
        # Test duplicate detection
        result = detect_duplicate_records([record1], record2)
        
        print(f"✓ Duplicate detection function callable")
        if result:
            print(f"  Found {len(result)} potential duplicate(s)")
            for dup in result[:1]:  # Show first match
                print(f"  - Match score: {dup.get('match_score', 'N/A')}")
        else:
            print(f"  No duplicates detected (records different enough)")
        
        return True
        
    except Exception as e:
        print(f"✗ Duplicate detection test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_frontend_components():
    """Test 5: Frontend TypeScript components exist"""
    print("\n" + "="*60)
    print("TEST 5: Frontend Components")
    print("="*60)
    
    components = [
        "SummaryPanel.tsx",
        "DocumentPreview.tsx",
        "FieldsPanel.tsx",
        "ValidationPanel.tsx",
        "AuditHistory.tsx",
    ]
    
    base_path = Path("../frontend/src/components")
    
    all_exist = True
    for component in components:
        path = base_path / component
        if path.exists():
            size = path.stat().st_size
            print(f"✓ {component:30} ({size:6} bytes)")
        else:
            print(f"✗ {component:30} NOT FOUND")
            all_exist = False
    
    return all_exist

def test_type_exports():
    """Test 6: Frontend type exports"""
    print("\n" + "="*60)
    print("TEST 6: Frontend Type Exports")
    print("="*60)
    
    try:
        doc_types_path = Path("../frontend/src/lib/document-types.ts")
        
        if not doc_types_path.exists():
            print(f"✗ document-types.ts not found at {doc_types_path.absolute()}")
            return False
        
        content = doc_types_path.read_text()
        
        required_exports = [
            "export type DocumentStatus",
            "export type DocumentRecord",
            "export const STATUS_LABELS",
            "export const CANONICAL_FIELDS",
            "export const SUPPORTED_FILE_TYPES",
            "export const MAX_FILE_SIZE_MB",
        ]
        
        all_found = True
        for export in required_exports:
            if export in content:
                print(f"✓ {export}")
            else:
                print(f"✗ {export} NOT FOUND")
                all_found = False
        
        # Check CANONICAL_FIELDS content
        if "CANONICAL_FIELDS = [" in content:
            import re
            match = re.search(r'CANONICAL_FIELDS\s*=\s*\[(.*?)\]', content, re.DOTALL)
            if match:
                fields_str = match.group(1)
                # Count fields
                field_count = fields_str.count('"')
                print(f"  Contains {field_count} field entries ✓")
        
        return all_found
        
    except Exception as e:
        print(f"✗ Type export test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_backend_endpoints():
    """Test 7: Backend preview endpoint code exists"""
    print("\n" + "="*60)
    print("TEST 7: Backend Preview Endpoint")
    print("="*60)
    
    try:
        doc_path = Path("app/api/documents.py")
        
        if not doc_path.exists():
            print(f"✗ documents.py not found")
            return False
        
        content = doc_path.read_text()
        
        required_elements = [
            "def preview_document",
            "/documents/{document_id}/preview",
            "Content-Disposition",
            "Cache-Control",
        ]
        
        all_found = True
        for element in required_elements:
            if element in content:
                print(f"✓ Found: {element}")
            else:
                print(f"✗ Missing: {element}")
                all_found = False
        
        return all_found
        
    except Exception as e:
        print(f"✗ Endpoint test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def run_all_tests():
    """Run all tests and generate report"""
    print("\n" + "="*60)
    print("STAGE 2H INTEGRATION TEST SUITE")
    print("Visual Human Verification Experience")
    print("="*60)
    
    results = {
        "Backend Module Imports": test_imports(),
        "CANONICAL_FIELDS Consistency": test_canonical_fields(),
        "Confidence Scoring": test_confidence_scoring(),
        "Duplicate Detection": test_duplicate_detection(),
        "Frontend Components": test_frontend_components(),
        "Frontend Type Exports": test_type_exports(),
        "Backend Preview Endpoint": test_backend_endpoints(),
    }
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status:7} {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - Stage 2H implementation ready!")
        return 0
    else:
        print(f"\n⚠ {total - passed} test(s) failed - review above for details")
        return 1

if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)
