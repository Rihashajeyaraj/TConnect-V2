from typing import Optional, Dict, Any
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class SignUpRequest(BaseModel):
    email: str
    password: str


class DevTokenRequest(BaseModel):
    email: Optional[str] = "admin@twiteconnect.com"
    role: Optional[str] = "Super Admin"


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[Dict[str, Any]] = None
