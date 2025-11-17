from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from contextlib import contextmanager
from typing import Generator

from src.core.config import settings
from src.db.models import Base

# Create database engine
engine = create_engine(
    settings.database_url,
    echo=settings.db_echo,
    poolclass=NullPool if settings.env == "test" else None,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database session.
    Usage in FastAPI endpoints:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    Context manager for database session.
    Usage:
        with get_db_context() as db:
            db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    This will create all tables defined in models.py
    """
    Base.metadata.create_all(bind=engine)


def drop_db():
    """
    Drop all database tables.
    WARNING: This will delete all data!
    """
    Base.metadata.drop_all(bind=engine)


def reset_db():
    """
    Reset database by dropping and recreating all tables.
    WARNING: This will delete all data!
    """
    drop_db()
    init_db()
