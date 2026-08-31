"""
Language detection module for multilingual document recognition.

Supports detection of:
- English
- Tamil
- Mixed English and Tamil
"""

import re
from typing import Literal

# Tamil Unicode range: U+0B80 to U+0BFF
TAMIL_UNICODE_RANGE = range(0x0B80, 0x0BFF + 1)

# Common Tamil characters (common Unicode points in Tamil range)
TAMIL_COMMON_CHARS = {
    '\u0b85', '\u0b86', '\u0b87', '\u0b88', '\u0b89',  # Vowels
    '\u0b8e', '\u0b8f', '\u0b90', '\u0b92', '\u0b93',
    '\u0b94', '\u0b95', '\u0b99', '\u0b9a', '\u0b9c',  # Consonants
    '\u0b9f', '\u0ba3', '\u0ba4', '\u0ba8', '\u0ba9',
    '\u0baa', '\u0bab', '\u0bac', '\u0bad', '\u0bae',
    '\u0baf', '\u0bb0', '\u0bb1', '\u0bb2', '\u0bb3',
    '\u0bb4', '\u0bb5', '\u0bb6', '\u0bb7', '\u0bb8',
    '\u0bb9', '\u0bbe', '\u0bbf', '\u0bc0', '\u0bc1',  # Vowel signs
    '\u0bc2', '\u0bc6', '\u0bc7', '\u0bc8', '\u0bca',
    '\u0bcb', '\u0bcc', '\u0bcd',
}

# Common English patterns
ENGLISH_WORD_PATTERN = re.compile(r'\b[a-zA-Z]+\b')


def _count_tamil_characters(text: str) -> int:
    """Count Tamil Unicode characters in text."""
    return sum(1 for char in text if ord(char) in TAMIL_UNICODE_RANGE)


def _count_english_words(text: str) -> int:
    """Count English words in text."""
    return len(ENGLISH_WORD_PATTERN.findall(text))


def _count_english_characters(text: str) -> int:
    """Count English alphabetic characters."""
    return sum(1 for char in text if char.isascii() and char.isalpha())


def detect_language(text: str) -> dict[str, str | float]:
    """
    Detect language(s) in OCR text.

    Returns:
    {
        "detected_language": "English" | "Tamil" | "Tamil + English",
        "language_code": "en" | "ta" | "ta-en",
        "tamil_characters": int,
        "english_words": int,
        "confidence": float (0.0-1.0)
    }
    """
    if not text or not text.strip():
        return {
            "detected_language": "Unknown",
            "language_code": "unknown",
            "tamil_characters": 0,
            "english_words": 0,
            "confidence": 0.0,
        }

    tamil_count = _count_tamil_characters(text)
    english_count = _count_english_words(text)
    english_chars = _count_english_characters(text)

    # Normalize by text length
    total_chars = len(text.replace(" ", "").replace("\n", ""))

    if total_chars == 0:
        return {
            "detected_language": "Unknown",
            "language_code": "unknown",
            "tamil_characters": 0,
            "english_words": 0,
            "confidence": 0.0,
        }

    tamil_ratio = tamil_count / total_chars if total_chars > 0 else 0
    english_ratio = english_chars / total_chars if total_chars > 0 else 0

    # Decision logic
    tamil_threshold = 0.05  # At least 5% Tamil characters
    english_threshold = 0.05  # At least 5% English characters

    has_tamil = tamil_ratio >= tamil_threshold
    has_english = english_ratio >= english_threshold

    if has_tamil and has_english:
        # Mixed content
        confidence = min(tamil_ratio, english_ratio) * 100
        return {
            "detected_language": "Tamil + English",
            "language_code": "ta-en",
            "tamil_characters": tamil_count,
            "english_words": english_count,
            "confidence": round(confidence, 2),
        }
    elif has_tamil:
        confidence = tamil_ratio * 100
        return {
            "detected_language": "Tamil",
            "language_code": "ta",
            "tamil_characters": tamil_count,
            "english_words": english_count,
            "confidence": round(confidence, 2),
        }
    elif has_english:
        confidence = english_ratio * 100
        return {
            "detected_language": "English",
            "language_code": "en",
            "tamil_characters": tamil_count,
            "english_words": english_count,
            "confidence": round(confidence, 2),
        }
    else:
        # Default to unknown
        return {
            "detected_language": "Unknown",
            "language_code": "unknown",
            "tamil_characters": tamil_count,
            "english_words": english_count,
            "confidence": 0.0,
        }
