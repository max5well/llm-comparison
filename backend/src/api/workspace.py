from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
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

    # Check file type
    allowed_types = settings.allowed_file_types.split(',')
    file_ext = os.path.splitext(file.filename)[1][1:]  # Remove the dot

    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not supported. Allowed types: {allowed_types}"
        )

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
            created_at=d.created_at.isoformat()
        )
        for d in documents
    ]
