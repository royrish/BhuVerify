#!/usr/bin/env python
"""Quick test of language detection module."""

from app.services.language_detection import detect_language

# Test English
en_text = """
Owner Name: Ramesh Kumar
Survey Number: 142
Khata Number: 782
Land Area: 2.45 Acres
District: Chengalpattu
"""
result = detect_language(en_text)
print("English detection:")
print(f"  Language: {result['detected_language']}")
print(f"  Code: {result['language_code']}")
print(f"  Confidence: {result['confidence']}%")
print()

# Test Tamil
ta_text = """
உரிமையாளர் பெயர்: ரமேஷ் குமார்
சர்வே எண்: 142
காத்தா எண்: 782
நிலப்பரப்பு: 2.45 ஏக்கர்
மாவட்டம்: செங்கல்பட்டு
"""
result = detect_language(ta_text)
print("Tamil detection:")
print(f"  Language: {result['detected_language']}")
print(f"  Code: {result['language_code']}")
print(f"  Confidence: {result['confidence']}%")
print()

# Test mixed
mixed_text = """
Owner Name / உரிமையாளர் பெயர்
Ramesh Kumar / ரமேஷ் குமார்

District / மாவட்டம்
Chengalpattu / செங்கல்பட்டு

Survey Number / சர்வே எண்
142 / 3A

Khata Number / காத்தா எண்
782
"""
result = detect_language(mixed_text)
print("Mixed detection:")
print(f"  Language: {result['detected_language']}")
print(f"  Code: {result['language_code']}")
print(f"  Confidence: {result['confidence']}%")
