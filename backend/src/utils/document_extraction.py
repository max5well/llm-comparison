import os
from typing import Optional
from pathlib import Path
import hashlib


class DocumentExtractor:
    """Extract text from various document formats."""

    @staticmethod
    def extract_text(file_path: str) -> str:
        """
        Extract text from a document based on file extension.

        Args:
            file_path: Path to the document

        Returns:
            Extracted text content

        Raises:
            ValueError: If file type is not supported
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_ext = path.suffix.lower()

        if file_ext == '.pdf':
            return DocumentExtractor._extract_from_pdf(file_path)
        elif file_ext == '.docx':
            return DocumentExtractor._extract_from_docx(file_path)
        elif file_ext in ['.txt', '.md', '.text']:
            return DocumentExtractor._extract_from_text(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

    @staticmethod
    def _extract_from_pdf(file_path: str) -> str:
        """Extract text from PDF file."""
        try:
            import pdfplumber

            text_content = []
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)

            return "\n\n".join(text_content)

        except ImportError:
            raise ImportError(
                "pdfplumber is required for PDF extraction. "
                "Install it with: pip install pdfplumber"
            )
        except Exception as e:
            raise Exception(f"Error extracting PDF: {str(e)}")

    @staticmethod
    def _extract_from_docx(file_path: str) -> str:
        """Extract text from DOCX file."""
        try:
            from docx import Document

            doc = Document(file_path)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            return "\n\n".join(paragraphs)

        except ImportError:
            raise ImportError(
                "python-docx is required for DOCX extraction. "
                "Install it with: pip install python-docx"
            )
        except Exception as e:
            raise Exception(f"Error extracting DOCX: {str(e)}")

    @staticmethod
    def _extract_from_text(file_path: str) -> str:
        """Extract text from plain text file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            # Try with different encoding
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()
        except Exception as e:
            raise Exception(f"Error reading text file: {str(e)}")

    @staticmethod
    def get_file_hash(file_path: str) -> str:
        """
        Calculate SHA-256 hash of file content.

        Args:
            file_path: Path to file

        Returns:
            Hex digest of file hash
        """
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    def get_file_size(file_path: str) -> int:
        """
        Get file size in bytes.

        Args:
            file_path: Path to file

        Returns:
            File size in bytes
        """
        return os.path.getsize(file_path)

    @staticmethod
    def is_supported_file(filename: str) -> bool:
        """
        Check if file type is supported.

        Args:
            filename: Name of the file

        Returns:
            True if supported, False otherwise
        """
        supported_extensions = ['.pdf', '.docx', '.txt', '.md', '.text']
        ext = Path(filename).suffix.lower()
        return ext in supported_extensions

    @staticmethod
    def clean_extracted_text(text: str) -> str:
        """
        Clean extracted text by removing common artifacts.

        Args:
            text: Raw extracted text

        Returns:
            Cleaned text
        """
        import re

        # Remove page numbers (common patterns)
        text = re.sub(r'\n\s*\d+\s*\n', '\n', text)

        # Remove excessive whitespace
        text = re.sub(r' +', ' ', text)

        # Remove excessive newlines (but keep paragraph breaks)
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)

        # Remove common header/footer artifacts
        text = re.sub(r'\n\s*(Page \d+ of \d+)\s*\n', '\n', text, flags=re.IGNORECASE)

        # Strip leading/trailing whitespace
        text = text.strip()

        return text
