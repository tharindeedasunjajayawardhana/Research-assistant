# Research Assistant for PDFs

An AI-powered research assistant that helps users upload, analyze, and ask questions about academic research papers.

## Live Demo

- **Frontend:** https://research-assistant-lhq3xgnrh-tharindee.vercel.app
- **Backend API:** https://research-assistant-mh0h.onrender.com
- **API Documentation:** https://research-assistant-mh0h.onrender.com/docs

## Features

- Upload research papers in PDF format.
- Extract and process paper content.
- Generate structured AI-powered summaries.
- Ask natural-language questions about uploaded papers.
- Retrieve relevant paper passages to support question answering.
- Store and manage uploaded papers.
- Additional research and analysis features implemented in the application.

## Technology Stack

- Frontend: React, TypeScript, Vite/TanStack Start
- Backend: Python, FastAPI
- Database: SQLAlchemy and SQLite, with Alembic migrations
- AI: Google Gemini API
- Deployment: Vercel (frontend) and Render (backend)

## Prerequisites

- Python 3.12
- Node.js and npm
- A Google Gemini API key

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/tharindeedasunjajayawardhana/Research-assistant.git
cd Research-assistant
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

Windows PowerShell:
```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies and initialize the database:

```bash
pip install -r requirements.txt
alembic upgrade head
```

Configure the required backend environment variables using the settings documented in the project configuration. Add your own Gemini API key locally; never commit API keys or other secrets.

Start the API:

```bash
uvicorn app.main:app --reload
```

The backend should be available at http://localhost:8000.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend-clean
npm install
```

Configure `VITE_API_URL` to point to the local backend:

```text
VITE_API_URL=http://localhost:8000
```

Use the frontend's environment-file conventions, then start the development server:

```bash
npm run dev
```

Open the local URL printed by the development server.

## Usage

1. Open the application.
2. Upload a research paper in PDF format.
3. Wait for processing to complete.
4. Read the generated structured summary.
5. Ask questions about the paper using the chat interface.

## Deployment

The frontend is deployed on Vercel and the FastAPI backend on Render. The backend runs database migrations before starting the application.

## Security

Do not commit API keys, credentials, or production environment files. Configure secrets through the appropriate environment settings.

## Limitations

AI-generated summaries and answers can contain errors. Verify important findings against the original paper.
