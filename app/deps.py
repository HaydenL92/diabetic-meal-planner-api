# app/deps.py
from fastapi import Depends
from sqlalchemy.orm import Session

from .db import SessionLocal
from . import models
from . import security


def get_db() -> Session:
    """Yield a DB session and make sure it's closed afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_current_user(
    token: str = Depends(security.oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Dependency that returns the current authenticated user
    using the token provided by OAuth2.
    """
    return await security.get_current_user(token=token, db=db)


async def get_current_active_user(
    current_user = Depends(get_current_user),  # note: no type hint on purpose
):
    """
    Optionally enforce 'active' users; right now just returns the user.
    """
    # If you later add an 'is_active' flag to models.User, you can enforce it here.
    return current_user
