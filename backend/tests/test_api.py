import os
import tempfile
import uuid
from pathlib import Path

database_path = Path(tempfile.gettempdir()) / f"cinego-test-{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"
os.environ["JWT_SECRET"] = "test-jwt-secret-at-least-32-characters"
os.environ["QR_SIGNING_SECRET"] = "test-qr-signing-secret-at-least-32"
os.environ["ENVIRONMENT"] = "test"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings
from app.db import Base, engine
from app.main import app
from app.models import User
from app.schemas import RegisterRequest
from app.security import hash_password, sign_ticket, verify_password, verify_ticket_token


@pytest.fixture(scope="module", autouse=True)
def create_test_schema():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)
    engine.dispose()
    try:
        database_path.unlink()
    except FileNotFoundError:
        pass


def test_liveness_and_readiness() -> None:
    with TestClient(app) as client:
        assert client.get("/health/live").json() == {"status": "alive"}
        assert client.get("/health/ready").json() == {"status": "ready"}


def test_admin_endpoint_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 401


def test_customer_registration_login_and_logout() -> None:
    with TestClient(app) as client:
        registered = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Customer",
                "email": "customer@example.com",
                "phone": "+84123456789",
                "password": "StrongPassword123",
                "password_confirmation": "StrongPassword123",
            },
        )
        assert registered.status_code == 201
        assert "password_hash" not in registered.json()

        login = client.post(
            "/api/v1/auth/login",
            json={"email": "CUSTOMER@example.com", "password": "StrongPassword123"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/v1/auth/me", headers=headers).json()["role"] == "customer"
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
        assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_admin_access_is_role_gated() -> None:
    with engine.begin() as connection:
        connection.execute(
            User.__table__.insert().values(
                full_name="Test Admin",
                email="admin@example.com",
                password_hash=hash_password("AdminPassword123"),
                role="admin",
                status="active",
            )
        )
    with TestClient(app) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123"},
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 200
        dashboard = client.get("/api/v1/admin/dashboard", headers=headers)
        assert dashboard.status_code == 200
        assert dashboard.json()["paid_orders"] == 0


def test_registration_requires_matching_strong_password() -> None:
    try:
        RegisterRequest(
            full_name="CineGo User",
            email="user@example.com",
            password="Password123",
            password_confirmation="Different123",
        )
    except ValidationError:
        return
    raise AssertionError("mismatched passwords must fail validation")


def test_passwords_are_hashed_and_qr_tokens_are_signed() -> None:
    password = "correct-horse-battery-staple"
    encoded = hash_password(password)
    assert encoded != password
    assert verify_password(password, encoded)
    assert not verify_password("incorrect-password", encoded)

    ticket_id = uuid.uuid4()
    token = sign_ticket(ticket_id)
    assert verify_ticket_token(token) == ticket_id
    assert verify_ticket_token(token[:-1] + ("0" if token[-1] != "0" else "1")) is None


def test_production_configuration_rejects_wildcard_cors() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url="postgresql+psycopg://user:pass@localhost/db",
            jwt_secret="test-jwt-secret-at-least-32-characters",
            qr_signing_secret="test-qr-signing-secret-at-least-32",
            cors_origins=["*"],
        )
