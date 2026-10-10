# Paper Insight backend

FastAPI + SQLAlchemy + Alembic + PyMuPDF. SQLite for local use, or PostgreSQL with pgvector.

Done: PDF upload and per-page extraction, page-aware chunks, embeddings, semantic search,
structured summaries, and a RAG chatbot with page citations.

## Run (PowerShell)

    cd backend
    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    pip install -r requirements-dev.txt
    copy .env.example .env
    # Put a Gemini key in .env as GEMINI_API_KEY (https://aistudio.google.com/apikey)
    pytest
    alembic upgrade head
    uvicorn app.main:app --reload --port 8000

Docs: http://localhost:8000/docs

Summary and chat need `GEMINI_API_KEY`. Upload, status, pages, chunks, and search work without it.

## API

| Method | Path | Notes |
|---|---|---|
| POST | /papers | multipart field `file`. 201, status `processing`. |
| GET | /papers/{id} | status: processing / ready / failed |
| POST | /papers/{id}/reprocess | re-run extraction + chunking (202) |
| GET | /papers/{id}/pages | per-page metadata |
| GET | /papers/{id}/pages/{n} | text of one page |
| GET | /papers/{id}/chunks?page=N | chunks with page number and character offsets |
| GET | /papers/{id}/search?q= | semantic search over chunks |
| GET | /papers/{id}/summary?lang=auto\|en\|ja\|si | structured summary (cached) |
| POST | /papers/{id}/chat | `{ "question", "lang" }` → answer + page sources |
| GET | /health | checks the database |

Errors are `{"detail": "..."}`.
