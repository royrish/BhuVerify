"""
OCR module - backward compatibility layer.

This module re-exports the OCR functionality from ocr_provider.py for backward compatibility.
New code should import from ocr_provider directly.
"""

from app.services.ocr_provider import (
    OcrProcessingError,
    OcrProvider,
    RapidOcrProvider,
    get_ocr_provider,
    preprocess_image,
    process_document,
)

__all__ = [
    "OcrProcessingError",
    "OcrProvider",
    "RapidOcrProvider",
    "get_ocr_provider",
    "preprocess_image",
    "process_document",
]


# Legacy exports for backward compatibility
def _get_ocr_engine():
    """Get OCR engine (legacy function)."""
    provider = get_ocr_provider()
    if isinstance(provider, RapidOcrProvider):
        return provider.engine
    raise RuntimeError("OCR provider is not RapidOCR")
