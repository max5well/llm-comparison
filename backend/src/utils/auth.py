import secrets
import hashlib
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session

from src.db.queries import get_user_by_api_key
from src.db.models import User

# API Key header
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def generate_api_key() -> str:
    """
    Generate a secure random API key.

    Returns:
        API key string
    """
    return secrets.token_urlsafe(32)


def hash_api_key(api_key: str) -> str:
    """
    Hash an API key for secure storage.

    Args:
        api_key: Plain text API key

    Returns:
        Hashed API key
    """
    return hashlib.sha256(api_key.encode()).hexdigest()


def verify_api_key(api_key: str, hashed_key: str) -> bool:
    """
    Verify an API key against its hash.

    Args:
        api_key: Plain text API key
        hashed_key: Stored hash

    Returns:
        True if valid, False otherwise
    """
    return hash_api_key(api_key) == hashed_key


async def get_current_user(
    api_key: str = Security(api_key_header),
    db: Session = None
) -> User:
    """
    Dependency to get current user from API key.

    Args:
        api_key: API key from header
        db: Database session

    Returns:
        User object

    Raises:
        HTTPException: If API key is invalid or user not found
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key is missing"
        )

    user = get_user_by_api_key(db, api_key)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


def create_user_with_api_key(email: str, db: Session) -> tuple[User, str]:
    """
    Create a new user with an API key.

    Args:
        email: User email
        db: Database session

    Returns:
        Tuple of (User object, plain API key)
    """
    from src.db.queries import create_user

    # Generate API key
    api_key = generate_api_key()
    api_key_hash = hash_api_key(api_key)

    # Create user
    user = create_user(db, email=email, api_key=api_key, api_key_hash=api_key_hash)

    return user, api_key
