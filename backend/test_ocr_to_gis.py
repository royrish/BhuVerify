#!/usr/bin/env python3
"""Test OCR to GIS integration."""

import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_gis_boundary_generation():
    """Test that generate_cadastral_boundary works with extracted OCR data."""
    
    print("Testing OCR → GIS Integration")
    print("=" * 70)
    
    try:
        print("\n1. Testing import...")
        from app.gis_engine import generate_cadastral_boundary
        print("   ✓ generate_cadastral_boundary imported successfully")
    except ImportError as e:
        print(f"   ✗ Import failed: {e}")
        return False
    
    try:
        print("\n2. Testing function with sample OCR data...")
        
        # Simulated extracted OCR data
        sample_ocr_extract = {
            "village": "Kelambakkam",
            "tehsil": "Tiruporur",
            "district": "Chengalpattu",
            "state": "Tamil Nadu",
            "survey_number": "142/3A",
            "area": "2.45",
            "area_unit": "Acres",
        }
        
        result = await generate_cadastral_boundary(
            village=sample_ocr_extract.get("village", ""),
            tehsil=sample_ocr_extract.get("tehsil", ""),
            district=sample_ocr_extract.get("district", ""),
            state=sample_ocr_extract.get("state", ""),
            survey_number=sample_ocr_extract.get("survey_number", "N/A"),
            land_area=float(sample_ocr_extract.get("area", "1.0").split()[0]),
            area_unit=sample_ocr_extract.get("area_unit", "Acres"),
        )
        
        print("   ✓ Function executed successfully")
        print(f"\n3. Result structure:")
        print(f"   - Status: {result.get('status')}")
        print(f"   - Center: {result.get('center')}")
        print(f"   - GeoJSON type: {result.get('geojson', {}).get('type')}")
        print(f"   - Geometry type: {result.get('geojson', {}).get('geometry', {}).get('type')}")
        
        props = result.get('geojson', {}).get('properties', {})
        print(f"   - Survey No: {props.get('survey_no')}")
        print(f"   - Area (m²): {props.get('area_sq_m')}")
        print(f"   - Location: {props.get('location')}")
        print(f"   - Source: {props.get('source')}")
        
        if (result.get('status') == 'SUCCESS' and 
            result.get('center') and 
            result.get('geojson')):
            print("\n✓ OCR → GIS integration test PASSED")
            return True
        else:
            print("\n✗ Result structure incomplete")
            return False
            
    except Exception as e:
        print(f"   ✗ Function test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_gis_boundary_generation())
    sys.exit(0 if success else 1)
