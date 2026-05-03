from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    anthropic_api_key: str
    jwt_secret: str
    max_free_messages_per_day: int = 5
    max_memory_items: int = 50

    class Config:
        env_file = ".env"


settings = Settings()
