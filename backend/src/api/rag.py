from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from uuid import UUID
import asyncio

from src.db.database import get_db
from src.db.queries import (
    get_workspace, get_document, update_document_status,
    create_chunk, get_document_chunks
)
from src.core.rag_index import RAGIndex
from src.core.chunking import TextChunker
from src.utils.document_extraction import DocumentExtractor
from src.core.llm_providers import get_llm_provider, LLMMessage

router = APIRouter(prefix="/rag", tags=["RAG"])


class ProcessDocumentRequest(BaseModel):
    document_id: str


class ProcessDocumentResponse(BaseModel):
    document_id: str
    status: str
    message: str


class QueryRequest(BaseModel):
    workspace_id: str
    question: str
    model: str = "gpt-4o-mini"
    provider: str = "openai"
    top_k: int = 5
    temperature: float = 0.7
    max_tokens: int = 2000


class QueryResponse(BaseModel):
    question: str
    answer: str
    model: str
    provider: str
    retrieved_chunks: List[Dict[str, Any]]
    tokens_in: int
    tokens_out: int
    latency_ms: int
    cost_usd: float


class ChunkResponse(BaseModel):
    id: str
    content: str
    chunk_index: int
    token_count: Optional[int]

    class Config:
        from_attributes = True


async def process_document_background(
    document_id: UUID,
    workspace_id: UUID,
    db: Session
):
    """
    Background task to process a document:
    1. Extract text
    2. Chunk text
    3. Generate embeddings
    4. Store in vector database
    """
    try:
        # Get document and workspace
        document = get_document(db, document_id)
        workspace = get_workspace(db, workspace_id)

        if not document or not workspace:
            return

        # Update status to processing
        update_document_status(db, document_id, "processing")

        # Extract text
        extractor = DocumentExtractor()
        text = extractor.extract_text(document.file_path)
        text = extractor.clean_extracted_text(text)

        # Chunk text
        chunker = TextChunker(
            chunk_size=workspace.chunk_size,
            chunk_overlap=workspace.chunk_overlap
        )
        chunks = chunker.chunk_text(text, metadata={
            "document_id": str(document_id),
            "filename": document.filename,
            "file_type": document.file_type
        })

        # Initialize RAG index
        collection_name = workspace.vector_collection_id or f"workspace_{workspace_id}"
        rag_index = RAGIndex(
            collection_name=collection_name,
            embedding_provider=workspace.embedding_provider,
            embedding_model=workspace.embedding_model
        )

        # Prepare chunks for embedding
        chunk_texts = [chunk.content for chunk in chunks]
        chunk_metadatas = [chunk.metadata for chunk in chunks]

        # Add to vector store
        vector_ids = await rag_index.add_chunks(
            chunks=chunk_texts,
            metadatas=chunk_metadatas
        )

        # Store chunks in database
        for i, (chunk, vector_id) in enumerate(zip(chunks, vector_ids)):
            create_chunk(
                db=db,
                document_id=document_id,
                workspace_id=workspace_id,
                chunk_index=i,
                content=chunk.content,
                token_count=chunk.token_count,
                vector_id=vector_id,
                metadata=chunk.metadata
            )

        # Update workspace with collection ID
        if not workspace.vector_collection_id:
            workspace.vector_collection_id = collection_name
            db.commit()

        # Update document status
        document.total_chunks = len(chunks)
        update_document_status(db, document_id, "completed")

    except Exception as e:
        # Update document status to failed
        import traceback
        error_details = f"{str(e)}\n{traceback.format_exc()}"
        update_document_status(db, document_id, "failed", error_message=str(e))
        print(f"Error processing document {document_id}: {error_details}")


@router.post("/{document_id}/process", response_model=ProcessDocumentResponse)
async def process_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Process a document: extract text, chunk, and create embeddings.

    This is an async operation that runs in the background.
    """
    document = get_document(db, UUID(document_id))

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.processing_status == "processing":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is already being processed"
        )

    # Add background task
    background_tasks.add_task(
        process_document_background,
        UUID(document_id),
        document.workspace_id,
        db
    )

    return ProcessDocumentResponse(
        document_id=document_id,
        status="processing",
        message="Document processing started"
    )


@router.post("/query", response_model=QueryResponse)
async def query_rag(
    request: QueryRequest,
    db: Session = Depends(get_db)
):
    """
    Query the RAG system with a question.

    Returns an AI-generated answer based on retrieved context.
    """
    import time

    # Get workspace
    workspace = get_workspace(db, UUID(request.workspace_id))

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    if not workspace.vector_collection_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Workspace has no indexed documents"
        )

    start_time = time.time()

    # Initialize RAG index
    rag_index = RAGIndex(
        collection_name=workspace.vector_collection_id,
        embedding_provider=workspace.embedding_provider,
        embedding_model=workspace.embedding_model
    )

    # Retrieve relevant chunks
    results = await rag_index.query(
        query_text=request.question,
        top_k=request.top_k
    )

    retrieved_chunks = [
        {
            "content": doc,
            "metadata": meta,
            "distance": dist
        }
        for doc, meta, dist in zip(
            results['documents'],
            results['metadatas'],
            results['distances']
        )
    ]

    # Build context from retrieved chunks
    context = "\n\n".join([
        f"[Chunk {i+1}]\n{chunk['content']}"
        for i, chunk in enumerate(retrieved_chunks)
    ])

    # Create RAG prompt
    prompt = f"""Answer the following question based on the provided context.

Context:
{context}

Question: {request.question}

Provide a clear, accurate answer based only on the information in the context. If the context doesn't contain enough information to answer the question, say so."""

    # Get LLM response
    llm = get_llm_provider(request.provider)
    messages = [LLMMessage(role="user", content=prompt)]

    llm_response = await llm.generate(
        messages=messages,
        model=request.model,
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )

    latency_ms = int((time.time() - start_time) * 1000)

    if llm_response.error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM error: {llm_response.error}"
        )

    return QueryResponse(
        question=request.question,
        answer=llm_response.content,
        model=request.model,
        provider=request.provider,
        retrieved_chunks=retrieved_chunks,
        tokens_in=llm_response.tokens_in,
        tokens_out=llm_response.tokens_out,
        latency_ms=latency_ms,
        cost_usd=llm_response.cost_usd
    )


@router.get("/document/{document_id}/chunks", response_model=List[ChunkResponse])
async def get_chunks(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Get all chunks for a document.
    """
    chunks = get_document_chunks(db, UUID(document_id))

    return [
        ChunkResponse(
            id=str(chunk.id),
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            token_count=chunk.token_count
        )
        for chunk in chunks
    ]
