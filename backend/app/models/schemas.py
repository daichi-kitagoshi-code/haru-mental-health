from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class MessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    character_id: str


class MessageResponse(BaseModel):
    reply: str
    crisis_level: int = 0
    crisis_resources: list[str] | None = None


class CharacterGenerateRequest(BaseModel):
    gender: str = Field(..., pattern="^(male|female|other)$")
    age_group: str = Field(..., pattern="^(same|older|younger)$")


class CharacterProfile(BaseModel):
    id: str
    name: str
    gender: str
    age: int
    hometown: str
    education: str
    background: str
    hobbies: str
    personality: str
    speech_style: str
    created_at: datetime


class SignUpRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=50)


class SignInRequest(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    plan: str
