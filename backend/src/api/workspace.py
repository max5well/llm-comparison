from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
import os
import shutil

from src.db.database import get_db
from src.db.queries import (
    create_workspace, get_workspace, get_user_workspaces,
    delete_workspace, create_document, get_workspace_documents
)
from src.core.config import settings

router = APIRouter(prefix="/workspace", tags=["Workspaces"])


class WorkspaceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    embedding_model: str = "text-embedding-3-small"
    embedding_provider: str = "openai"
    chunk_size: int = 1000
    chunk_overlap: int = 200


class WorkspaceResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    embedding_model: str
    embedding_provider: str
    chunk_size: int
    chunk_overlap: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: str
    workspace_id: str
    filename: str
    file_type: str
    file_size_bytes: Optional[int]
    processing_status: str
    total_chunks: int
    error_message: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.post("/create", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_endpoint(
    request: WorkspaceCreateRequest,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Create a new workspace for RAG evaluations.

    A workspace contains documents, embeddings, and evaluation configurations.
    """
    from uuid import UUID

    # Validate chunk_overlap is less than chunk_size
    if request.chunk_overlap >= request.chunk_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"chunk_overlap ({request.chunk_overlap}) must be less than chunk_size ({request.chunk_size})"
        )

    workspace = create_workspace(
        db=db,
        user_id=UUID(user_id),
        name=request.name,
        embedding_model=request.embedding_model,
        embedding_provider=request.embedding_provider,
        description=request.description,
        chunk_size=request.chunk_size,
        chunk_overlap=request.chunk_overlap
    )

    return WorkspaceResponse(
        id=str(workspace.id),
        user_id=str(workspace.user_id),
        name=workspace.name,
        description=workspace.description,
        embedding_model=workspace.embedding_model,
        embedding_provider=workspace.embedding_provider,
        chunk_size=workspace.chunk_size,
        chunk_overlap=workspace.chunk_overlap,
        created_at=workspace.created_at.isoformat(),
        updated_at=workspace.updated_at.isoformat()
    )


@router.get("/list", response_model=List[WorkspaceResponse])
async def list_workspaces(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    List all workspaces for a user.
    """
    from uuid import UUID

    workspaces = get_user_workspaces(db, UUID(user_id))

    return [
        WorkspaceResponse(
            id=str(w.id),
            user_id=str(w.user_id),
            name=w.name,
            description=w.description,
            embedding_model=w.embedding_model,
            embedding_provider=w.embedding_provider,
            chunk_size=w.chunk_size,
            chunk_overlap=w.chunk_overlap,
            created_at=w.created_at.isoformat(),
            updated_at=w.updated_at.isoformat()
        )
        for w in workspaces
    ]


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Get details of a specific workspace.
    """
    workspace = get_workspace(db, UUID(workspace_id))

    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    return WorkspaceResponse(
        id=str(workspace.id),
        user_id=str(workspace.user_id),
        name=workspace.name,
        description=workspace.description,
        embedding_model=workspace.embedding_model,
        embedding_provider=workspace.embedding_provider,
        chunk_size=workspace.chunk_size,
        chunk_overlap=workspace.chunk_overlap,
        created_at=workspace.created_at.isoformat(),
        updated_at=workspace.updated_at.isoformat()
    )


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace_endpoint(
    workspace_id: str,
    request: dict,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = None
):
    """
    Update workspace settings (chunk_size, chunk_overlap, embedding_model, embedding_provider).
    If chunking or embedding settings change, all completed documents will be reprocessed.
    """
    workspace = get_workspace(db, UUID(workspace_id))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    # Store old values to detect changes
    old_chunk_size = workspace.chunk_size
    old_chunk_overlap = workspace.chunk_overlap
    old_embedding_model = workspace.embedding_model
    old_embedding_provider = workspace.embedding_provider

    # Update allowed fields
    chunking_changed = False
    embedding_changed = False
    
    if "chunk_size" in request:
        workspace.chunk_size = request["chunk_size"]
        if request["chunk_size"] != old_chunk_size:
            chunking_changed = True
    if "chunk_overlap" in request:
        workspace.chunk_overlap = request["chunk_overlap"]
        if request["chunk_overlap"] != old_chunk_overlap:
            chunking_changed = True
    if "embedding_model" in request:
        workspace.embedding_model = request["embedding_model"]
        if request["embedding_model"] != old_embedding_model:
            embedding_changed = True
    if "embedding_provider" in request:
        workspace.embedding_provider = request["embedding_provider"]
        if request["embedding_provider"] != old_embedding_provider:
            embedding_changed = True
    if "name" in request:
        workspace.name = request["name"]
    if "description" in request:
        workspace.description = request["description"]

    # Validate chunk_overlap is less than chunk_size
    if workspace.chunk_overlap >= workspace.chunk_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"chunk_overlap ({workspace.chunk_overlap}) must be less than chunk_size ({workspace.chunk_size})"
        )

    # If chunking or embedding settings changed, mark all completed documents for reprocessing
    if chunking_changed or embedding_changed:
        from src.db.queries import get_workspace_documents, update_document_status
        from src.db.models import Chunk
        
        completed_documents = get_workspace_documents(db, UUID(workspace_id))
        completed_documents = [doc for doc in completed_documents if doc.processing_status == 'completed']
        
        # Delete all chunks and mark documents as pending for reprocessing
        for document in completed_documents:
            # Delete chunks from database
            db.query(Chunk).filter(Chunk.document_id == document.id).delete()
            # Reset chunk count
            document.total_chunks = 0
            # Mark as pending for reprocessing
            update_document_status(db, document.id, "pending")
        
        db.commit()
        
        # Trigger reprocessing of all marked documents in background
        if background_tasks and completed_documents:
            from src.api.rag import process_document_background
            for document in completed_documents:
                background_tasks.add_task(
                    process_document_background,
                    document.id,
                    UUID(workspace_id),
                    db
                )

    db.commit()
    db.refresh(workspace)

    return WorkspaceResponse(
        id=str(workspace.id),
        user_id=str(workspace.user_id),
        name=workspace.name,
        description=workspace.description,
        embedding_model=workspace.embedding_model,
        embedding_provider=workspace.embedding_provider,
        chunk_size=workspace.chunk_size,
        chunk_overlap=workspace.chunk_overlap,
        created_at=workspace.created_at.isoformat(),
        updated_at=workspace.updated_at.isoformat()
    )


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_endpoint(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a workspace and all associated data.
    """
    success = delete_workspace(db, UUID(workspace_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    return None


@router.post("/{workspace_id}/upload", response_model=DocumentResponse)
async def upload_document(
    workspace_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a document to a workspace.

    Supported file types: PDF, DOCX, TXT
    """
    # Verify workspace exists
    workspace = get_workspace(db, UUID(workspace_id))
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )

    # Check file type using DocumentExtractor's supported types
    from src.utils.document_extraction import DocumentExtractor
    
    if not DocumentExtractor.is_supported_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not supported. Please upload a supported file format."
        )
    
    file_ext = os.path.splitext(file.filename)[1][1:]  # Remove the dot

    # Create upload directory
    upload_dir = f"./data/uploads/{workspace_id}"
    os.makedirs(upload_dir, exist_ok=True)

    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Get file size
    file_size = os.path.getsize(file_path)

    # Create document record
    document = create_document(
        db=db,
        workspace_id=UUID(workspace_id),
        filename=file.filename,
        file_path=file_path,
        file_type=file_ext,
        file_size_bytes=file_size,
        processing_status="pending"
    )

    return DocumentResponse(
        id=str(document.id),
        workspace_id=str(document.workspace_id),
        filename=document.filename,
        file_type=document.file_type,
        file_size_bytes=document.file_size_bytes,
        processing_status=document.processing_status,
        total_chunks=document.total_chunks,
        created_at=document.created_at.isoformat()
    )


@router.get("/{workspace_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    List all documents in a workspace.
    """
    documents = get_workspace_documents(db, UUID(workspace_id))

    return [
        DocumentResponse(
            id=str(d.id),
            workspace_id=str(d.workspace_id),
            filename=d.filename,
            file_type=d.file_type,
            file_size_bytes=d.file_size_bytes,
            processing_status=d.processing_status,
            total_chunks=d.total_chunks,
            error_message=d.error_message,
            created_at=d.created_at.isoformat()
        )
        for d in documents
    ]


@router.delete("/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_endpoint(
    document_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a document and all associated chunks/embeddings.
    """
    from src.db.queries import delete_document

    success = delete_document(db, UUID(document_id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return None


@router.patch("/documents/{document_id}")
async def update_document_endpoint(
    document_id: str,
    request: dict,
    db: Session = Depends(get_db)
):
    """
    Update document properties (currently supports filename only).
    """
    from src.db.queries import get_document

    document = get_document(db, UUID(document_id))
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Update filename if provided
    if "filename" in request:
        document.filename = request["filename"]
        db.commit()
        db.refresh(document)

    return {
        "id": str(document.id),
        "filename": document.filename,
        "updated_at": document.updated_at.isoformat()
    }


@router.get("/{workspace_id}/stats")
async def get_workspace_stats(
    workspace_id: str,
    db: Session = Depends(get_db)
):
    """
    Get workspace statistics including total chunks.
    """
    documents = get_workspace_documents(db, UUID(workspace_id))

    total_chunks = sum(d.total_chunks for d in documents if d.processing_status == 'completed')
    completed_documents = sum(1 for d in documents if d.processing_status == 'completed')

    return {
        "total_documents": len(documents),
        "completed_documents": completed_documents,
        "total_chunks": total_chunks,
        "suggested_min_questions": max(1, total_chunks // 10),
        "suggested_max_questions": max(5, total_chunks // 2)
    }


@router.get("/api-keys/status")
async def get_api_keys_status():
    """
    Check which API keys are configured.
    Returns a map of provider -> boolean indicating if key is set.
    """
    return {
        "openai": bool(settings.openai_api_key and settings.openai_api_key.strip()),
        "anthropic": bool(settings.anthropic_api_key and settings.anthropic_api_key.strip()),
        "mistral": bool(settings.mistral_api_key and settings.mistral_api_key.strip()),
        "together": bool(settings.together_api_key and settings.together_api_key.strip()),
        "huggingface": bool(settings.huggingface_api_key and settings.huggingface_api_key.strip()),
        "voyage": bool(settings.voyage_api_key and settings.voyage_api_key.strip()),
        "cohere": bool(settings.cohere_api_key and settings.cohere_api_key.strip()),
    }
