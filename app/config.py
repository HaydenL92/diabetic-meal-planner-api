from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # USDA FoodData Central API key (from env var FDC_API_KEY)
    fdc_api_key: str | None = None

    # Optional: accept DATABASE_URL without blowing up,
    # even if we don't use it here
    database_url: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # ← ignore any other env vars we don't define
    )

settings = Settings()
