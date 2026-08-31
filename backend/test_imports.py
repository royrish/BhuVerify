#!/usr/bin/env python3
"""Test that all backend modules import successfully."""

import sys

try:
    print("Testing backend imports...")
    
    import app
    print("✓ app")
    
    import app.api.documents
    print("✓ app.api.documents")
    
    import app.services.ocr
    print("✓ app.services.ocr")
    
    import app.services.extraction
    print("✓ app.services.extraction")
    
    import app.services.confidence
    print("✓ app.services.confidence")
    
    import app.services.persistence
    print("✓ app.services.persistence")
    
    print("\n✓ All backend modules imported successfully!")
    sys.exit(0)
    
except Exception as e:
    print(f"\n✗ Import error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
