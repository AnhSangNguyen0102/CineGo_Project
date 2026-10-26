from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CineGo API"
    environment: Literal["development", "test", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    database_url: str
    jwt_secret: str = Field(min_length=32)
    jwt_issuer: str = "cinego-api"
    jwt_access_token_minutes: int = Field(default=30, ge=5, le=120)
    qr_signing_secret: str = Field(min_length=32)
    seat_hold_minutes: int = Field(default=5, ge=1, le=15)
    max_seats_per_order: int = Field(default=8, ge=1, le=20)
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=list)
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    frontend_reset_url: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return [origin.strip().rstrip("/") for origin in value]

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.environment == "production":
            if "*" in self.cors_origins:
                raise ValueError("Wildcard CORS is not allowed in production")
        if self.jwt_secret == self.qr_signing_secret:
            raise ValueError("JWT_SECRET and QR_SIGNING_SECRET must be different")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
