from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from ..ai_schemas import (
    AgentRequest,
    AgentRunOut,
    ChatMessageOut,
    ChatRequest,
    ConcernsReportOut,
    QuizOut,
    ResponseLanguage,
    ScholarlySearchOut,
    SuggestionOut,
    SummaryOut,
    VerifyOut,
    VerifyRequest,
)
from ..config import Settings, get_settings
from ..deps import get_db
from ..models import AgentRun, AgentStep, Paper
from ..services import rag
from ..services.agent import execute_agent, run_to_out
from ..services.concerns import get_research_concerns
from ..services.llm import LlmError
from ..services.quiz import generate_quiz
from ..services.scholarly import search_scholarly
from ..services.verification import verify_claim

router = APIRouter(prefix="/papers", tags=["ai"])


def _ready_paper(db: Session, paper_id: str) -> Paper:
    paper = db.get(Paper, paper_id)
    if paper is None:
        raise HTTPException(404, "Paper not found.")
    if paper.status != "ready":
        raise HTTPException(409, "This paper is still being processed.")
    return paper


@router.get("/{paper_id}/summary", response_model=SummaryOut)
def get_summary(
    paper_id: str,
    lang: ResponseLanguage = Query("auto"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return rag.get_summary(db, paper_id, lang, settings)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.get("/{paper_id}/export")
def export_summary(
    paper_id: str,
    lang: ResponseLanguage = Query("auto"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    paper = _ready_paper(db, paper_id)
    try:
        summary = rag.get_summary(db, paper_id, lang, settings)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc
    markdown = rag.export_markdown(summary, paper.filename)
    return PlainTextResponse(markdown, media_type="text/markdown")


@router.get("/{paper_id}/concerns", response_model=ConcernsReportOut)
def get_concerns(
    paper_id: str,
    lang: ResponseLanguage = Query("auto"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return get_research_concerns(db, paper_id, lang, settings, force_refresh=False)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.post("/{paper_id}/concerns/analyze", response_model=ConcernsReportOut)
def reanalyze_concerns(
    paper_id: str,
    lang: ResponseLanguage = Query("auto"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return get_research_concerns(db, paper_id, lang, settings, force_refresh=True)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.post("/{paper_id}/chat", response_model=ChatMessageOut)
def chat(
    paper_id: str,
    body: ChatRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return rag.answer_question(db, paper_id, body.question, body.lang, settings)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.get("/{paper_id}/chat/messages", response_model=list[ChatMessageOut])
def chat_history(paper_id: str, db: Session = Depends(get_db)):
    _ready_paper(db, paper_id)
    return rag.list_chat_messages(db, paper_id)


@router.post("/{paper_id}/verify", response_model=VerifyOut)
def verify(
    paper_id: str,
    body: VerifyRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return verify_claim(db, paper_id, body.claim, body.lang, settings)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.get("/{paper_id}/suggestions", response_model=SuggestionOut)
def suggestions(paper_id: str, db: Session = Depends(get_db)):
    paper = _ready_paper(db, paper_id)
    return SuggestionOut(questions=rag.suggested_questions(paper))


@router.post("/{paper_id}/quiz", response_model=QuizOut)
def quiz(
    paper_id: str,
    lang: ResponseLanguage = Query("auto"),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return generate_quiz(db, paper_id, lang, settings)
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.post("/{paper_id}/agent/runs", response_model=AgentRunOut)
def start_agent(
    paper_id: str,
    body: AgentRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    try:
        return execute_agent(
            db,
            paper_id,
            body.task,
            body.lang,
            settings,
            paper_ids=body.paper_ids,
            approve_external=body.approve_external,
        )
    except LlmError as exc:
        raise HTTPException(503, exc.message) from exc


@router.get("/{paper_id}/agent/runs/{run_id}", response_model=AgentRunOut)
def get_agent_run(paper_id: str, run_id: str, db: Session = Depends(get_db)):
    _ready_paper(db, paper_id)
    run = db.get(AgentRun, run_id)
    if run is None or run.paper_id != paper_id:
        raise HTTPException(404, "Agent run not found.")
    from sqlalchemy import select

    steps = list(
        db.scalars(select(AgentStep).where(AgentStep.run_id == run_id).order_by(AgentStep.step_index))
    )
    return run_to_out(run, steps)


@router.get("/{paper_id}/scholarly", response_model=ScholarlySearchOut)
def scholarly(
    paper_id: str,
    q: str = Query(..., min_length=1, max_length=300),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    _ready_paper(db, paper_id)
    return search_scholarly(settings, q)
