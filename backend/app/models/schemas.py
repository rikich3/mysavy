from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: str
    name: str
    email: EmailStr
    is_company: bool = False
    company_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ThemeBase(BaseModel):
    title: str
    description: Optional[str] = None

class ThemeCreate(ThemeBase):
    pass

class ThemeResponse(ThemeBase):
    id: int
    creator_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
