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
    education: Optional[str] = None
    background: Optional[str] = None
    hobbies: Optional[str] = None
    personality: str
    speech_style: str
    occupation: Optional[str] = None
    current_city: Optional[str] = None
    family_background: Optional[str] = None
    childhood_story: Optional[str] = None
    love_history: Optional[str] = None
    current_romance_status: Optional[str] = None
    work_hours: Optional[str] = None
    narrative_profile: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime


class CharacterWorry(BaseModel):
    id: str
    character_id: str
    title: str
    worry_type: str
    current_status: str
    started_at: datetime


class CharacterPost(BaseModel):
    id: str
    character_id: str
    content: str
    post_type: str
    scheduled_at: datetime
    is_published: bool
    related_worry_id: Optional[str] = None
    created_at: datetime


class PostFeedItem(BaseModel):
    post: CharacterPost
    character: CharacterProfile


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
