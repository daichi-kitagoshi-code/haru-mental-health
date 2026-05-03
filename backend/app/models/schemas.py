from datetime import datetime
from pydantic import BaseModel, Field


class MessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)
    mode: str = Field(default="chat", pattern="^(chat|vent|consult|encourage)$")


class MessageResponse(BaseModel):
    reply: str
    crisis_level: int = 0
    crisis_resources: list[str] | None = None


class MoodLogRequest(BaseModel):
    score: int = Field(..., ge=1, le=5)
    note: str | None = None


class MoodLogResponse(BaseModel):
    id: str
    score: int
    note: str | None
    created_at: datetime


class CharacterSettingsRequest(BaseModel):
    char_name: str = Field(default="ハル", max_length=20)
    speech_style: str = Field(default="casual", pattern="^(casual|polite|kansai|cool)$")


class CharacterSettingsResponse(BaseModel):
    char_name: str
    speech_style: str


class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    plan: str
    created_at: datetime


class SignUpRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=50)


class SignInRequest(BaseModel):
    email: str
    password: str
