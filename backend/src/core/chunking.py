from typing import List, Dict, Any
from dataclasses import dataclass
import re
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass
class Chunk:
    """Represents a text chunk with metadata."""
    content: str
    index: int
    start_char: int
    end_char: int
    token_count: int
    metadata: Dict[str, Any] = None


class TextChunker:
    """
    Handles text chunking using LangChain's RecursiveCharacterTextSplitter.

    This is more reliable than custom chunking as it:
    - Respects natural document structure (paragraphs, sentences)
    - Handles edge cases better
    - Is battle-tested across thousands of use cases
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        encoding_name: str = "cl100k_base"
    ):
        """
        Initialize text chunker.

        Args:
            chunk_size: Target size of each chunk in tokens
            chunk_overlap: Number of overlapping tokens between chunks
            encoding_name: Tiktoken encoding to use for tokenization
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.encoding = tiktoken.get_encoding(encoding_name)

        # Initialize LangChain's RecursiveCharacterTextSplitter
        self.langchain_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self.count_tokens,
            separators=["\n\n", "\n", ". ", " ", ""],  # Try to split on natural boundaries
            keep_separator=True
        )

    def chunk_text(
        self,
        text: str,
        metadata: Dict[str, Any] = None
    ) -> List[Chunk]:
        """
        Chunk text using LangChain's RecursiveCharacterTextSplitter.

        This intelligently splits on natural boundaries (paragraphs, sentences, etc.)
        and is much more reliable than custom implementations.

        Args:
            text: Text to chunk
            metadata: Optional metadata to attach to each chunk

        Returns:
            List of Chunk objects
        """
        if not text or not text.strip():
            return []

        # Clean and normalize text
        text = self._clean_text(text)

        # Use LangChain's splitter to get text chunks
        text_chunks = self.langchain_splitter.split_text(text)

        # Convert to our Chunk objects
        chunks = []
        current_char_pos = 0

        for index, chunk_text in enumerate(text_chunks):
            chunk_text = chunk_text.strip()
            if not chunk_text:
                continue

            # Find the actual position in original text
            start_char = text.find(chunk_text, current_char_pos)
            if start_char == -1:
                start_char = current_char_pos

            end_char = start_char + len(chunk_text)
            token_count = self.count_tokens(chunk_text)

            chunks.append(Chunk(
                content=chunk_text,
                index=index,
                start_char=start_char,
                end_char=end_char,
                token_count=token_count,
                metadata=metadata or {}
            ))

            current_char_pos = end_char

        return chunks

    def chunk_by_paragraphs(
        self,
        text: str,
        metadata: Dict[str, Any] = None
    ) -> List[Chunk]:
        """
        Chunk text by paragraphs, combining them to reach target size.

        Args:
            text: Text to chunk
            metadata: Optional metadata

        Returns:
            List of Chunk objects
        """
        text = self._clean_text(text)
        paragraphs = self._split_into_paragraphs(text)

        chunks = []
        current_chunk = []
        current_tokens = 0
        chunk_index = 0
        start_char = 0

        for para in paragraphs:
            para_tokens = len(self.encoding.encode(para))

            # If single paragraph exceeds chunk size, split it
            if para_tokens > self.chunk_size:
                # Save current chunk if exists
                if current_chunk:
                    chunk_text = "\n\n".join(current_chunk)
                    chunks.append(Chunk(
                        content=chunk_text,
                        index=chunk_index,
                        start_char=start_char,
                        end_char=start_char + len(chunk_text),
                        token_count=current_tokens,
                        metadata=metadata or {}
                    ))
                    chunk_index += 1
                    start_char += len(chunk_text)
                    current_chunk = []
                    current_tokens = 0

                # Split large paragraph
                para_chunks = self.chunk_text(para, metadata)
                for pc in para_chunks:
                    pc.index = chunk_index
                    chunks.append(pc)
                    chunk_index += 1

                continue

            # Check if adding this paragraph exceeds chunk size
            if current_tokens + para_tokens > self.chunk_size and current_chunk:
                # Save current chunk
                chunk_text = "\n\n".join(current_chunk)
                chunks.append(Chunk(
                    content=chunk_text,
                    index=chunk_index,
                    start_char=start_char,
                    end_char=start_char + len(chunk_text),
                    token_count=current_tokens,
                    metadata=metadata or {}
                ))
                chunk_index += 1
                start_char += len(chunk_text)
                current_chunk = []
                current_tokens = 0

            current_chunk.append(para)
            current_tokens += para_tokens

        # Add final chunk
        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(Chunk(
                content=chunk_text,
                index=chunk_index,
                start_char=start_char,
                end_char=start_char + len(chunk_text),
                token_count=current_tokens,
                metadata=metadata or {}
            ))

        return chunks

    def _clean_text(self, text: str) -> str:
        """Clean and normalize text."""
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove excessive newlines
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
        return text.strip()

    def _split_into_paragraphs(self, text: str) -> List[str]:
        """Split text into paragraphs."""
        paragraphs = re.split(r'\n\s*\n', text)
        return [p.strip() for p in paragraphs if p.strip()]

    def _adjust_chunk_boundary(self, text: str) -> str:
        """
        Try to end chunk at a sentence boundary.
        Looks for the last sentence ending near the chunk end.
        """
        # Look for sentence endings
        sentence_endings = ['. ', '.\n', '! ', '!\n', '? ', '?\n']

        # Find the last sentence ending in the last 20% of the chunk
        search_start = max(0, int(len(text) * 0.8))
        search_text = text[search_start:]

        best_pos = -1
        for ending in sentence_endings:
            pos = search_text.rfind(ending)
            if pos > best_pos:
                best_pos = pos

        if best_pos > 0:
            # Trim to sentence boundary
            actual_pos = search_start + best_pos + len(ending) - 1
            return text[:actual_pos + 1]

        return text

    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))
