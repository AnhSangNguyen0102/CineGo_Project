import uuid
from datetime import datetime, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import AuthSession, User
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[Session, Depends(get_db)]


def get_active_session(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: DbSession,
) -> tuple[User, AuthSession]:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = decode_access_token(credentials.credentials)
        user_id = uuid.UUID(payload["sub"])
        session_id = uuid.UUID(payload["sid"])
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        raise unauthorized from None

    auth_session = db.get(AuthSession, session_id)
    now = datetime.now(timezone.utc)
    expires_at = auth_session.expires_at if auth_session is not None else now
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if (
        auth_session is None
        or auth_session.user_id != user_id
        or auth_session.revoked_at is not None
        or expires_at <= now
    ):
        raise unauthorized
    user = db.scalar(select(User).where(User.id == user_id))
    if user is None or user.status != "active":
        raise unauthorized
    return user, auth_session


def get_current_user(
    active_session: Annotated[tuple[User, AuthSession], Depends(get_active_session)],
) -> User:
    return active_session[0]


def require_roles(*roles: str):
    def role_dependency(user: Annotated[User, Depends(get_current_user)]) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return role_dependency


CurrentUser = Annotated[User, Depends(get_current_user)]
ActiveSession = Annotated[tuple[User, AuthSession], Depends(get_active_session)]
CustomerUser = Annotated[User, Depends(require_roles("customer"))]
StaffUser = Annotated[User, Depends(require_roles("staff", "admin"))]
AdminUser = Annotated[User, Depends(require_roles("admin"))]
