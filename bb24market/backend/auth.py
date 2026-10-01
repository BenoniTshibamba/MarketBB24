"""Password hashing + JWT auth helpers."""
import os
from datetime import datetime, timedelta

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from models import User

SECRET_KEY = os.getenv("JWT_SECRET", "bb24market-dev-secret-change-me")
ALGORITHM = "HS256"
TOKEN_DAYS = 30

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def make_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "role": user.role,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_db():
    """Yield a DB session. The factory is wired at startup via set_session_factory."""
    if _session_factory is None:
        raise RuntimeError("DB session not wired")
    db = _session_factory()
    try:
        yield db
    finally:
        db.close()


def set_session_factory(factory):
    global _session_factory
    _session_factory = factory


_session_factory = None


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not found")
    return user


def require_seller(user: User = Depends(get_current_user)) -> User:
    if user.role != "seller":
        raise HTTPException(status_code=403, detail="Seller account required")
    return user
