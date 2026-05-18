from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "MISAVY API"
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/misavy"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "a_very_secret_key_for_jwt_auth"

    class Config:
        env_file = ".env"

settings = Settings()
