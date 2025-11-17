from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from src.db.database import get_db
from src.db.queries import get_user_by_email
from src.utils.auth import create_user_with_api_key

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
