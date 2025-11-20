from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from uuid import uuid4
import asyncio
import time
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
import logging

from src.core.config import settings as app_settings
from src.core.embedding_providers import get_embedding_provider

logger = logging.getLogger(__name__)


class RAGIndex:
    """Manages vector storage and retrieval using ChromaDB."""

    def __init__(
        self,
        collection_name: str = None,
        persist_directory: str = None,
        embedding_provider: str = "openai",
        embedding_model: str = "text-embedding-3-small"
    ):
        """
        Initialize RAG index with ChromaDB.

        Args:
            collection_name: Name of the collection
            persist_directory: Directory to persist the database
            embedding_provider: Embedding provider to use
            embedding_model: Model to use for embeddings
        """
        self.collection_name = collection_name or str(uuid4())
        self.persist_directory = persist_directory or app_settings.chroma_persist_directory

        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=Settings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )

        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={
                "embedding_provider": embedding_provider,
                "embedding_model": embedding_model
            }
        )

        # Initialize embedding provider
        self.embedding_provider_name = embedding_provider
        self.embedding_model = embedding_model
        self.embedding_provider = get_embedding_provider(embedding_provider)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((Exception,)),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    async def _generate_embeddings_with_retry(self, chunks: List[str]) -> List[List[float]]:
        """
        Generate embeddings with retry logic and timeout.

        Retries up to 3 times with exponential backoff (2s, 4s, 8s).
        Includes a 60-second timeout per attempt.
        """
        try:
            # Add timeout to the embedding call
            embedding_response = await asyncio.wait_for(
                self.embedding_provider.embed_texts(
                    texts=chunks,
                    model=self.embedding_model
                ),
                timeout=60.0  # 60 second timeout
            )
            return embedding_response.embeddings
        except asyncio.TimeoutError:
            logger.error(f"Embedding generation timed out after 60 seconds for {len(chunks)} chunks")
            raise Exception(f"Embedding generation timed out. Try with fewer or smaller documents.")
        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

    async def add_chunks(
        self,
        chunks: List[str],
        metadatas: List[Dict[str, Any]] = None,
        ids: List[str] = None
    ) -> List[str]:
        """
        Add text chunks to the vector store.

        Args:
            chunks: List of text chunks
            metadatas: Optional list of metadata dicts for each chunk
            ids: Optional list of IDs for each chunk

        Returns:
            List of generated IDs
        """
        if not chunks:
            return []

        # Generate IDs if not provided
        if ids is None:
            ids = [str(uuid4()) for _ in chunks]

        # Generate embeddings with retry and timeout
        embeddings = await self._generate_embeddings_with_retry(chunks)


        # Prepare metadata
        if metadatas is None:
            metadatas = [{} for _ in chunks]

        # Add embedding metadata
        for i, meta in enumerate(metadatas):
            meta['embedding_model'] = self.embedding_model
            meta['embedding_provider'] = self.embedding_provider_name

        # Add to ChromaDB
        self.collection.add(
            embeddings=embeddings,
            documents=chunks,
            metadatas=metadatas,
            ids=ids
        )

        return ids

    async def query(
        self,
        query_text: str,
        top_k: int = 5,
        where: Dict[str, Any] = None,
        where_document: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Query the vector store for similar chunks.

        Args:
            query_text: Text to query
            top_k: Number of results to return
            where: Optional metadata filter
            where_document: Optional document content filter

        Returns:
            Dict with 'ids', 'documents', 'metadatas', 'distances'
        """
        # Generate query embedding
        embedding_response = await self.embedding_provider.embed_texts(
            texts=query_text,
            model=self.embedding_model
        )

        query_embedding = embedding_response.embeddings[0]

        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where,
            where_document=where_document
        )

        # Format results
        return {
            'ids': results['ids'][0] if results['ids'] else [],
            'documents': results['documents'][0] if results['documents'] else [],
            'metadatas': results['metadatas'][0] if results['metadatas'] else [],
            'distances': results['distances'][0] if results['distances'] else []
        }

    def get_by_ids(self, ids: List[str]) -> Dict[str, Any]:
        """
        Retrieve chunks by their IDs.

        Args:
            ids: List of chunk IDs

        Returns:
            Dict with 'ids', 'documents', 'metadatas'
        """
        results = self.collection.get(ids=ids)
        return results

    def delete_chunks(self, ids: List[str]) -> None:
        """
        Delete chunks by their IDs.

        Args:
            ids: List of chunk IDs to delete
        """
        self.collection.delete(ids=ids)

    def delete_collection(self) -> None:
        """Delete the entire collection."""
        self.client.delete_collection(name=self.collection_name)

    def get_collection_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the collection.

        Returns:
            Dict with collection statistics
        """
        count = self.collection.count()
        metadata = self.collection.metadata

        return {
            'collection_name': self.collection_name,
            'total_chunks': count,
            'metadata': metadata,
            'embedding_provider': self.embedding_provider_name,
            'embedding_model': self.embedding_model
        }

    async def rerank_results(
        self,
        query: str,
        results: List[Dict[str, Any]],
        top_k: int = None
    ) -> List[Dict[str, Any]]:
        """
        Re-rank search results (placeholder for advanced reranking).

        Args:
            query: Original query
            results: List of result dicts with 'content' and 'score'
            top_k: Number of results to return after reranking

        Returns:
            Reranked results
        """
        # For now, just return original results
        # In production, you might use a reranker model like Cohere rerank
        if top_k:
            return results[:top_k]
        return results

    def update_chunk_metadata(
        self,
        chunk_id: str,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Update metadata for a specific chunk.

        Args:
            chunk_id: ID of the chunk
            metadata: New metadata to merge/update
        """
        self.collection.update(
            ids=[chunk_id],
            metadatas=[metadata]
        )

    @staticmethod
    def list_collections(persist_directory: str = None) -> List[str]:
        """
        List all collections in the database.

        Args:
            persist_directory: Directory where ChromaDB is persisted

        Returns:
            List of collection names
        """
        persist_dir = persist_directory or app_settings.chroma_persist_directory
        client = chromadb.PersistentClient(path=persist_dir)
        collections = client.list_collections()
        return [col.name for col in collections]
