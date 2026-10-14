from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User, UserSettings
from backend.app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from backend.app.deps import (
    hash_password, verify_password, create_access_token, get_current_user, get_optional_user
)
from backend.app.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, response: Response, db: Session = Depends(get_db)):
    # Check if email or username already exists
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    if db.query(User).filter(User.username == user_in.username).first():
        raise HTTPException(status_code=400, detail="Username is already taken")

    hashed_pwd = hash_password(user_in.password)
    user = User(
        email=user_in.email,
        username=user_in.username,
        hashed_password=hashed_pwd,
        avatar=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_in.username}",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create default settings
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)
    db.commit()

    # Generate token
    token = create_access_token({"sub": str(user.id), "email": user.email})
    
    # Set httpOnly cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,  # Allow http in dev
    )

    return {
        "accessToken": token,
        "tokenType": "bearer",
        "user": user,
    }

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token({"sub": str(user.id), "email": user.email})
    
    # Set httpOnly cookie
    response.set_cookie(
        key=settings.COOKIE_NAME,
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,
    )

    return {
        "accessToken": token,
        "tokenType": "bearer",
        "user": user,
    }

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=Optional[UserResponse])
async def get_me(current_user: Optional[User] = Depends(get_optional_user)):
    return current_user
