from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, chat, character, b2b, notifications, posts

app = FastAPI(
    title="ハル API",
    description="AI友達アプリ「ハル」のバックエンドAPI",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(character.router)
app.include_router(b2b.router)
app.include_router(notifications.router)
app.include_router(posts.router)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "haru-api"}
