import secrets
import smtplib
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.dependencies import ActiveSession, CurrentUser, DbSession
from app.models import AuthSession, PasswordResetToken, User, WebSocketTicket
from app.schemas import (
    LoginRequest,
    PasswordResetConfirm,
    PasswordResetRequest,
    ProfileUpdate,
    RegisterRequest,
    TokenResponse,
    UserPublic,
)
from app.security import (
    create_access_token,
    dummy_password_hash,
    hash_password,
    hash_reset_token,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])
MAX_LOGIN_FAILURES = 5
LOGIN_LOCK_MINUTES = 15


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession) -> User:
    user = User(
        full_name=payload.full_name.strip(),
        email=str(payload.email).lower(),
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role="customer",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already in use") from None
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = db.scalar(
        select(User).where(User.email == str(payload.email).lower()).with_for_update()
    )
    password_ok = verify_password(
        payload.password,
        user.password_hash if user is not None else dummy_password_hash(),
    )
    now = datetime.now(timezone.utc)
    locked_until = user.locked_until if user is not None else None
    if locked_until is not None and locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    if user is None or not password_ok or user.status != "active":
        if user is not None and user.status == "active":
            if locked_until is not None and locked_until > now:
                raise HTTPException(status_code=429, detail="Too many failed attempts; try again later")
            user.failed_login_count += 1
            if user.failed_login_count >= MAX_LOGIN_FAILURES:
                user.locked_until = now + timedelta(minutes=LOGIN_LOCK_MINUTES)
                user.failed_login_count = 0
            db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if locked_until is not None and locked_until > now:
        raise HTTPException(status_code=429, detail="Too many failed attempts; try again later")

    user.failed_login_count = 0
    user.locked_until = None
    session_id = uuid.uuid4()
    token, expires_at = create_access_token(user.id, session_id)
    db.add(AuthSession(id=session_id, user_id=user.id, expires_at=expires_at))
    db.commit()
    return TokenResponse(
        access_token=token,
        expires_in=int((expires_at - now).total_seconds()),
        user=user,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(active_session: ActiveSession, db: DbSession) -> None:
    _, session = active_session
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/me", response_model=UserPublic)
def get_profile(user: CurrentUser) -> User:
    return user


@router.post("/socket-ticket", status_code=status.HTTP_201_CREATED)
def create_socket_ticket(user: CurrentUser, db: DbSession) -> dict[str, object]:
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=30)
    db.add(
        WebSocketTicket(
            token_hash=hash_reset_token(raw_token),
            user_id=user.id,
            expires_at=expires_at,
        )
    )
    db.commit()
    return {"ticket": raw_token, "expires_at": expires_at}


@router.patch("/me", response_model=UserPublic)
def update_profile(payload: ProfileUpdate, user: CurrentUser, db: DbSession) -> User:
    if payload.new_password is not None:
        if not verify_password(payload.current_password or "", user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        user.password_hash = hash_password(payload.new_password)
        user.failed_login_count = 0
        user.locked_until = None
        db.query(AuthSession).filter(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        ).update(
            {AuthSession.revoked_at: datetime.now(timezone.utc)},
            synchronize_session=False,
        )
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if "phone" in payload.model_fields_set:
        user.phone = payload.phone
    db.commit()
    db.refresh(user)
    return user


def _send_reset_email(email: str, token: str) -> None:
    settings = get_settings()
    if not all(
        (
            settings.smtp_host,
            settings.smtp_from_email,
            settings.frontend_reset_url,
        )
    ):
        raise HTTPException(status_code=503, detail="Password recovery email is not configured")
    message = EmailMessage()
    message["Subject"] = "CineGo password reset"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    message.set_content(
        f"Use this one-time token to reset your password: {token}\n"
        f"Reset page: {settings.frontend_reset_url}\n"
        "The token expires in 30 minutes. If you did not request this, ignore this email."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(payload: PasswordResetRequest, db: DbSession) -> dict[str, str]:
    settings = get_settings()
    if not settings.smtp_host or not settings.smtp_from_email or not settings.frontend_reset_url:
        raise HTTPException(status_code=503, detail="Password recovery email is not configured")
    user = db.scalar(select(User).where(User.email == str(payload.email).lower(), User.status == "active"))
    if user is not None:
        raw_token = secrets.token_urlsafe(32)
        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_reset_token(raw_token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(reset_record)
        db.commit()
        try:
            _send_reset_email(user.email, raw_token)
        except (OSError, smtplib.SMTPException):
            db.delete(reset_record)
            db.commit()
            raise HTTPException(status_code=503, detail="Password recovery email could not be sent") from None
    return {"message": "If the account exists, password reset instructions have been sent."}


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_password_reset(payload: PasswordResetConfirm, db: DbSession) -> None:
    reset = db.scalar(
        select(PasswordResetToken)
        .where(PasswordResetToken.token_hash == hash_reset_token(payload.token))
        .with_for_update()
    )
    now = datetime.now(timezone.utc)
    expires_at = reset.expires_at if reset is not None else now
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if reset is None or reset.used_at is not None or expires_at <= now:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user = db.get(User, reset.user_id)
    if user is None or user.status != "active":
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    user.password_hash = hash_password(payload.new_password)
    user.failed_login_count = 0
    user.locked_until = None
    reset.used_at = now
    db.query(AuthSession).filter(
        AuthSession.user_id == user.id,
        AuthSession.revoked_at.is_(None),
    ).update({AuthSession.revoked_at: now}, synchronize_session=False)
    db.commit()
