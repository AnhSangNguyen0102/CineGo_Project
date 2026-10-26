import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import get_settings

password_hash = PasswordHash.recommended()
_dummy_hash = password_hash.hash("CineGo-dummy-password-not-valid")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: uuid.UUID, session_id: uuid.UUID) -> tuple[str, datetime]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.jwt_access_token_minutes)
    token = jwt.encode(
        {
            "sub": str(user_id),
            "sid": str(session_id),
            "iss": settings.jwt_issuer,
            "iat": now,
            "exp": expires_at,
        },
        settings.jwt_secret,
        algorithm="HS256",
    )
    return token, expires_at


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)


def sign_ticket(ticket_id: uuid.UUID) -> str:
    message = ticket_id.hex
    signature = hmac.new(
        get_settings().qr_signing_secret.encode("utf-8"),
        message.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{message}.{signature}"


def verify_ticket_token(token: str) -> uuid.UUID | None:
    try:
        ticket_hex, provided_signature = token.split(".", 1)
        ticket_id = uuid.UUID(hex=ticket_hex)
    except (ValueError, AttributeError):
        return None
    expected_signature = sign_ticket(ticket_id).split(".", 1)[1]
    if not hmac.compare_digest(provided_signature, expected_signature):
        return None
    return ticket_id


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def dummy_password_hash() -> str:
    return _dummy_hash
