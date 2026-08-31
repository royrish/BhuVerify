"""
OCR Provider abstraction for multilingual document recognition.

Currently supports:
- English (RapidOCR)
- Tamil (RapidOCR if available)
"""

from io import BytesIO
from pathlib import PurePosixPath

import cv2
import numpy as np
import pypdfium2 as pdfium
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

from app.services.language_detection import detect_language

MAX_OCR_PAGES = 5
SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


class OcrProcessingError(Exception):
    pass


class OcrProvider:
    """Abstract OCR provider interface."""

    def process_image(self, image: np.ndarray) -> tuple[str, dict]:
        """
        Process a single image and return (text, metadata).

        Args:
            image: OpenCV image (BGR format)

        Returns:
            (raw_text, metadata) where metadata contains language detection info
        """
        raise NotImplementedError

    def process_document(
        self, content: bytes, filename: str, content_type: str | None
    ) -> dict:
        """
        Process a complete document (PDF or image).

        Returns:
        {
            "pages_processed": int,
            "raw_text": str,
            "ocr_engine": str,
            "ocr_engine_version": str,
            "detected_language": str,
            "language_code": str,
            "language_confidence": float,
        }
        """
        raise NotImplementedError


class RapidOcrProvider(OcrProvider):
    """RapidOCR provider for multilingual OCR."""

    def __init__(self):
        """Initialize RapidOCR engine."""
        if not hasattr(RapidOcrProvider, "_engine"):
            RapidOcrProvider._engine = RapidOCR()
        self.engine = RapidOcrProvider._engine

    def process_image(self, image: np.ndarray) -> tuple[str, dict]:
        """Process single image with RapidOCR."""
        try:
            result, _ = self.engine(image)
            text = self._extract_text(result)
            lang_info = detect_language(text)
            return text, lang_info
        except Exception as error:
            raise OcrProcessingError(f"Image processing failed: {error}") from error

    def process_document(
        self, content: bytes, filename: str, content_type: str | None
    ) -> dict:
        """Process complete document with language detection."""
        extension = PurePosixPath(filename).suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            raise OcrProcessingError(
                "Unsupported file type. Use PDF, JPG, JPEG, or PNG."
            )

        pages = (
            self._render_pdf(content)
            if extension == ".pdf"
            else [self._decode_image(content)]
        )

        page_text = []
        all_text_for_language_detection = []

        for page_number, image in enumerate(pages, start=1):
            try:
                prepared = self._preprocess_image(image)
                text, _ = self.process_image(prepared)
                all_text_for_language_detection.append(text)
                page_text.append(f"--- Page {page_number} ---\n{text}".rstrip())
            except Exception as error:
                raise OcrProcessingError(
                    f"Page {page_number} could not be processed: {error}"
                ) from error

        raw_text = "\n\n".join(page_text).strip()
        lang_info = detect_language(raw_text)

        return {
            "pages_processed": len(pages),
            "raw_text": raw_text,
            "ocr_engine": "RapidOCR",
            "ocr_engine_version": "1.2.3",
            "detected_language": lang_info["detected_language"],
            "language_code": lang_info["language_code"],
            "language_confidence": lang_info["confidence"],
        }

    @staticmethod
    def _decode_image(content: bytes) -> np.ndarray:
        """Decode image from bytes."""
        image = cv2.imdecode(np.frombuffer(content, dtype=np.uint8), cv2.IMREAD_COLOR)
        if image is None:
            raise OcrProcessingError(
                "The image file is corrupted or could not be decoded."
            )
        return image

    @staticmethod
    def _render_pdf(content: bytes) -> list[np.ndarray]:
        """Render PDF pages to images."""
        try:
            document = pdfium.PdfDocument(BytesIO(content))
            page_count = len(document)
            if page_count == 0:
                raise OcrProcessingError("The PDF does not contain any pages.")

            pages = []
            for page_index in range(min(page_count, MAX_OCR_PAGES)):
                page = document[page_index]
                bitmap = page.render(scale=2.0)
                pil_image = bitmap.to_pil()
                pages.append(
                    cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
                )
                page.close()
            document.close()
            return pages
        except OcrProcessingError:
            raise
        except Exception as error:
            raise OcrProcessingError(
                f"The PDF could not be rendered: {error}"
            ) from error

    @staticmethod
    def _deskew(image: np.ndarray) -> np.ndarray:
        """Correct image skew."""
        coordinates = np.column_stack(np.where(image < 250))
        if len(coordinates) < 10:
            return image

        angle = cv2.minAreaRect(coordinates.astype(np.float32))[-1]
        if angle < -45:
            angle += 90
        if abs(angle) < 0.5:
            return image

        height, width = image.shape[:2]
        center = (width // 2, height // 2)
        rotation = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(image, rotation, (width, height), borderValue=255)

    @staticmethod
    def _preprocess_image(image: np.ndarray) -> np.ndarray:
        """Preprocess image for OCR."""
        grayscale = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        denoised = cv2.fastNlMeansDenoising(grayscale, None, 10, 7, 21)
        contrast = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(
            denoised
        )
        thresholded = cv2.adaptiveThreshold(
            contrast,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )
        return RapidOcrProvider._deskew(thresholded)

    @staticmethod
    def _extract_text(result) -> str:
        """Extract text from OCR result."""
        if not result:
            return ""
        lines = []
        for item in result:
            if len(item) >= 2 and item[1]:
                lines.append(str(item[1]))
        return "\n".join(lines)


# Global provider instance
_provider: OcrProvider | None = None


def get_ocr_provider() -> OcrProvider:
    """Get or create the OCR provider."""
    global _provider
    if _provider is None:
        _provider = RapidOcrProvider()
    return _provider


def process_document(content: bytes, filename: str, content_type: str | None):
    """Process document using the default OCR provider."""
    return get_ocr_provider().process_document(content, filename, content_type)


# Legacy functions for backward compatibility
def preprocess_image(image: np.ndarray) -> np.ndarray:
    """Preprocess image (legacy)."""
    return RapidOcrProvider._preprocess_image(image)
