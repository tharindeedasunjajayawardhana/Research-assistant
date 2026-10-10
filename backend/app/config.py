from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/papers"
    storage_dir: str = "storage"
    max_upload_mb: int = 20
    max_pages: int = 300
    # A page with fewer characters than this AND an embedded image is treated as scanned.
    min_page_chars: int = 100
    # Chunking: chunks never cross a page boundary.
    chunk_max_chars: int = 1200
    chunk_overlap: int = 150
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,"
        "http://localhost:8080,http://127.0.0.1:8080,"
        "http://localhost:4173,http://127.0.0.1:4173"
    )

    # Answer generation (Gemini). Leave the key empty to disable summary and chat.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"
    retrieval_top_k: int = 6
    retrieval_candidate_k: int = 12
    min_score: float = 0.40
    rerank_enabled: bool = True
    max_excerpt_chars: int = 1800
    max_context_chars: int = 18000
    llm_max_retries: int = 1

    # 384-d multilingual model; same dimension as the existing pgvector column.
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dimensions: int = 384

    ocr_enabled: bool = True
    ocr_languages: str = "eng"
    ocr_executable: str = ""

    agent_max_steps: int = 8
    agent_max_llm_calls: int = 6
    agent_max_retrievals: int = 20
    agent_max_retries: int = 1

    scholarly_enabled: bool = True
    scholarly_mailto: str = ""
    scholarly_timeout_seconds: float = 12.0


@lru_cache
def get_settings() -> Settings:
    return Settings()
