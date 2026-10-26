import argparse
from getpass import getpass

from sqlalchemy import select

from app.db import SessionLocal
from app.models import User
from app.security import hash_password


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first CineGo administrator")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    email = args.email.strip().lower()
    password = getpass("Administrator password (minimum 8 characters): ")
    confirmation = getpass("Confirm password: ")
    if len(password) < 8 or password != confirmation:
        raise SystemExit("Passwords must match and contain at least 8 characters")

    with SessionLocal() as db:
        if db.scalar(select(User.id).where(User.email == email)) is not None:
            raise SystemExit("An account with that email already exists")
        db.add(
            User(
                full_name=args.name.strip(),
                email=email,
                password_hash=hash_password(password),
                role="admin",
                status="active",
            )
        )
        db.commit()
    print(f"Administrator account created for {email}")


if __name__ == "__main__":
    main()
