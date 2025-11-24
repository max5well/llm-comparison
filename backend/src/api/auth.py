from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
from uuid import UUID
import uuid

from src.db.database import get_db
from src.db.queries import get_user_by_email
from src.utils.auth import create_user_with_api_key
from src.core.google_oauth import GoogleOAuthService
from src.core.google_drive import GoogleDriveService

router = APIRouter(prefix="/auth", tags=["Authentication"])


class UserSignupRequest(BaseModel):
    email: EmailStr


class UserSignupResponse(BaseModel):
    user_id: str
    email: str
    api_key: str
    message: str


class UserInfoResponse(BaseModel):
    user_id: str
    email: str
    is_active: bool
    created_at: str


@router.post("/signup", response_model=UserSignupResponse, status_code=status.HTTP_201_CREATED)
async def signup(request: UserSignupRequest, db: Session = Depends(get_db)):
    """
    Create a new user account and generate API key.

    Returns the API key - store it securely as it won't be shown again.
    """
    # Check if user already exists
    existing_user = get_user_by_email(db, request.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Create user with API key
    user, api_key = create_user_with_api_key(request.email, db)

    return UserSignupResponse(
        user_id=str(user.id),
        email=user.email,
        api_key=api_key,
        message="User created successfully. Please store your API key securely."
    )


@router.get("/me", response_model=UserInfoResponse)
async def get_current_user_info(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get information about a user by ID.

    This is a simplified endpoint for the API key auth system.
    In a real system, you'd verify the API key and get the user.
    """
    from src.db.models import User
    from uuid import UUID

    user = db.query(User).filter(User.id == UUID(user_id)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserInfoResponse(
        user_id=str(user.id),
        email=user.email,
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )


# ==================== Google OAuth Endpoints ====================

class GoogleAuthUrlResponse(BaseModel):
    authorization_url: str
    state: str


class GoogleCallbackRequest(BaseModel):
    code: str
    state: str


class GoogleAuthResponse(BaseModel):
    user_id: str
    email: str
    name: str
    avatar_url: str
    api_key: str
    message: str


class GoogleDriveFileInfo(BaseModel):
    id: str
    name: str
    mimeType: str
    size: str | None
    modifiedTime: str
    iconLink: str | None


class GoogleDriveFilesResponse(BaseModel):
    files: list[GoogleDriveFileInfo]
    total: int


class GoogleDriveImportRequest(BaseModel):
    workspace_id: str
    file_ids: list[str]


class GoogleDriveImportResponse(BaseModel):
    imported_count: int
    failed_count: int
    document_ids: list[str]
    errors: list[str]


class GoogleDriveConnectionStatus(BaseModel):
    is_connected: bool
    email: str | None
    connected_at: str | None


# ==================== NEW: Google Drive Connection (Separate from Login) ====================

@router.get("/google/drive/connect/url", response_model=GoogleAuthUrlResponse)
async def get_google_drive_connect_url():
    """
    Get Google OAuth URL specifically for connecting Google Drive.

    This is separate from user authentication - users should already be logged in.
    This endpoint is for connecting their Drive account to enable file imports.
    """
    try:
        from src.core.google_oauth import DRIVE_SCOPES

        oauth_service = GoogleOAuthService()
        # Use the Drive callback redirect URI and Drive scopes
        drive_redirect_uri = "http://localhost:3000/auth/google/drive/callback"
        auth_url, state = oauth_service.get_authorization_url(
            redirect_uri=drive_redirect_uri,
            scopes=DRIVE_SCOPES  # Request Drive access
        )

        return GoogleAuthUrlResponse(
            authorization_url=auth_url,
            state=state
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Drive connection URL: {str(e)}"
        )


@router.post("/google/drive/connect/callback")
async def google_drive_connect_callback(
    request: GoogleCallbackRequest,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback for Drive connection.

    This connects a Google Drive account to an existing authenticated user.
    Does NOT create a new user account.
    """
    try:
        from src.db.models import User

        # Get existing user
        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        oauth_service = GoogleOAuthService()

        # Exchange code for tokens using Drive callback redirect URI
        drive_redirect_uri = "http://localhost:3000/auth/google/drive/callback"
        token_info = oauth_service.exchange_code_for_tokens(request.code, redirect_uri=drive_redirect_uri)

        # Get user info from Google
        user_info = oauth_service.get_user_info(token_info['access_token'])

        # Parse token expiry
        token_expiry = None
        if token_info.get('expiry'):
            token_expiry = datetime.fromisoformat(token_info['expiry'].replace('Z', '+00:00'))

        # Update user's Google Drive tokens
        user.google_id = user_info['id']
        user.google_access_token = token_info['access_token']
        user.google_refresh_token = token_info.get('refresh_token')
        user.google_token_expiry = token_expiry

        db.commit()
        db.refresh(user)

        return {
            "success": True,
            "message": "Google Drive connected successfully",
            "connected_email": user_info['email']
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to connect Google Drive: {str(e)}"
        )


@router.get("/google/drive/status", response_model=GoogleDriveConnectionStatus)
async def get_google_drive_status(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Check if user has connected their Google Drive account.
    """
    try:
        from src.db.models import User

        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        is_connected = bool(user.google_access_token)

        # Try to get the Google email from user info if connected
        google_email = None
        if is_connected and user.google_access_token:
            try:
                oauth_service = GoogleOAuthService()
                user_info = oauth_service.get_user_info(user.google_access_token)
                google_email = user_info.get('email')
            except:
                # Token might be expired, but still show as connected
                pass

        return GoogleDriveConnectionStatus(
            is_connected=is_connected,
            email=google_email,
            connected_at=user.google_token_expiry.isoformat() if user.google_token_expiry else None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check Drive status: {str(e)}"
        )


@router.delete("/google/drive/disconnect")
async def disconnect_google_drive(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Disconnect Google Drive from user account.
    """
    try:
        from src.db.models import User

        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Clear Google Drive tokens
        user.google_id = None
        user.google_access_token = None
        user.google_refresh_token = None
        user.google_token_expiry = None

        db.commit()

        return {
            "success": True,
            "message": "Google Drive disconnected successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to disconnect Google Drive: {str(e)}"
        )


# ==================== OLD: Google OAuth for Login (Deprecated) ====================

@router.get("/google/url", response_model=GoogleAuthUrlResponse)
async def get_google_auth_url():
    """
    Get Google OAuth authorization URL.

    Returns the URL to redirect the user to for Google authentication.
    The state token should be stored and validated in the callback.
    """
    try:
        oauth_service = GoogleOAuthService()
        auth_url, state = oauth_service.get_authorization_url()

        return GoogleAuthUrlResponse(
            authorization_url=auth_url,
            state=state
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate authorization URL: {str(e)}"
        )


@router.post("/google/callback", response_model=GoogleAuthResponse)
async def google_oauth_callback(
    request: GoogleCallbackRequest,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback.

    Exchange the authorization code for tokens, get user info from Google,
    and create or update the user in our database.
    """
    try:
        oauth_service = GoogleOAuthService()

        # Exchange code for tokens
        token_info = oauth_service.exchange_code_for_tokens(request.code)

        # Get user info from Google
        user_info = oauth_service.get_user_info(token_info['access_token'])

        # Parse token expiry
        token_expiry = None
        if token_info.get('expiry'):
            token_expiry = datetime.fromisoformat(token_info['expiry'].replace('Z', '+00:00'))

        # Check if user exists with this Google ID
        from src.db.models import User
        user = db.query(User).filter(User.google_id == user_info['id']).first()

        if user:
            # Update existing user's tokens
            user.google_access_token = token_info['access_token']
            user.google_refresh_token = token_info.get('refresh_token') or user.google_refresh_token
            user.google_token_expiry = token_expiry
            user.avatar_url = user_info.get('picture')
            user.name = user_info.get('name')
            db.commit()
            db.refresh(user)

            return GoogleAuthResponse(
                user_id=str(user.id),
                email=user.email,
                name=user.name or "",
                avatar_url=user.avatar_url or "",
                api_key=user.api_key,
                message="Successfully authenticated with Google"
            )
        else:
            # Create new user
            api_key_raw = str(uuid.uuid4())
            from src.utils.auth import hash_api_key
            api_key_hash = hash_api_key(api_key_raw)

            new_user = User(
                id=uuid.uuid4(),
                email=user_info['email'],
                api_key=api_key_raw,
                api_key_hash=api_key_hash,
                google_id=user_info['id'],
                google_access_token=token_info['access_token'],
                google_refresh_token=token_info.get('refresh_token'),
                google_token_expiry=token_expiry,
                avatar_url=user_info.get('picture'),
                name=user_info.get('name'),
                is_active=True
            )

            db.add(new_user)
            db.commit()
            db.refresh(new_user)

            return GoogleAuthResponse(
                user_id=str(new_user.id),
                email=new_user.email,
                name=new_user.name or "",
                avatar_url=new_user.avatar_url or "",
                api_key=api_key_raw,
                message="Account created successfully with Google"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}"
        )


@router.get("/google/drive/files", response_model=GoogleDriveFilesResponse)
async def list_google_drive_files(
    user_id: str,
    folder_id: str | None = None,
    db: Session = Depends(get_db)
):
    """
    List files from user's Google Drive.

    Requires the user to have authenticated with Google OAuth.
    """
    try:
        from src.db.models import User

        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.google_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has not authenticated with Google"
            )

        # Initialize Google Drive service
        drive_service = GoogleDriveService(
            access_token=user.google_access_token,
            refresh_token=user.google_refresh_token
        )

        # List files
        files = drive_service.list_files(folder_id=folder_id, page_size=100)

        # Convert to response format
        file_list = [
            GoogleDriveFileInfo(
                id=f['id'],
                name=f['name'],
                mimeType=f['mimeType'],
                size=str(f.get('size', 0)),
                modifiedTime=f['modifiedTime'],
                iconLink=f.get('iconLink')
            )
            for f in files
        ]

        return GoogleDriveFilesResponse(
            files=file_list,
            total=len(file_list)
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Google Drive files: {str(e)}"
        )


@router.post("/google/drive/import", response_model=GoogleDriveImportResponse)
async def import_from_google_drive(
    request: GoogleDriveImportRequest,
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Import files from Google Drive into a workspace.

    Downloads files from Google Drive and processes them as documents.
    """
    try:
        from src.db.models import User, Document, Workspace
        import os
        import hashlib

        user = db.query(User).filter(User.id == UUID(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.google_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User has not authenticated with Google"
            )

        # Verify workspace exists and belongs to user
        workspace = db.query(Workspace).filter(
            Workspace.id == UUID(request.workspace_id),
            Workspace.user_id == user.id
        ).first()

        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found or access denied"
            )

        # Initialize Google Drive service
        drive_service = GoogleDriveService(
            access_token=user.google_access_token,
            refresh_token=user.google_refresh_token
        )

        imported_ids = []
        errors = []

        # Import each file
        for file_id in request.file_ids:
            try:
                # Get file metadata
                metadata = drive_service.get_file_metadata(file_id)

                # Download or export file content
                if drive_service.is_google_doc(metadata['mimeType']):
                    # Export Google Docs to standard format
                    export_mime_type = drive_service.get_export_mime_type(metadata['mimeType'])
                    file_content = drive_service.export_google_doc(file_id, export_mime_type)
                    # Update filename extension
                    filename = metadata['name']
                    if export_mime_type.endswith('wordprocessingml.document'):
                        filename += '.docx'
                    elif export_mime_type.endswith('spreadsheetml.sheet'):
                        filename += '.xlsx'
                    elif export_mime_type.endswith('presentationml.presentation'):
                        filename += '.pptx'
                else:
                    # Download regular file
                    file_content = drive_service.download_file(file_id)
                    filename = metadata['name']

                # Save file to disk
                upload_dir = f"/tmp/uploads/{user.id}/{request.workspace_id}"
                os.makedirs(upload_dir, exist_ok=True)
                file_path = os.path.join(upload_dir, filename)

                with open(file_path, 'wb') as f:
                    f.write(file_content)

                # Calculate content hash
                content_hash = hashlib.sha256(file_content).hexdigest()

                # Determine file type
                file_extension = filename.split('.')[-1].lower() if '.' in filename else ''

                # Create document record
                document = Document(
                    id=uuid.uuid4(),
                    workspace_id=UUID(request.workspace_id),
                    filename=filename,
                    file_path=file_path,
                    file_type=file_extension,
                    file_size_bytes=len(file_content),
                    content_hash=content_hash,
                    processing_status='pending',
                    source='google_drive',
                    source_id=file_id
                )

                db.add(document)
                db.commit()
                db.refresh(document)

                imported_ids.append(str(document.id))

            except Exception as e:
                errors.append(f"Failed to import {file_id}: {str(e)}")

        return GoogleDriveImportResponse(
            imported_count=len(imported_ids),
            failed_count=len(errors),
            document_ids=imported_ids,
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import files: {str(e)}"
        )
