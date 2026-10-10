from typing import Literal

from pydantic import BaseModel, Field

ResponseLanguage = Literal["auto", "en", "ja", "si", "zh", "es", "fr", "de"]
Verdict = Literal[
    "supported",
    "contradicted",
    "partially_supported",
    "insufficient_evidence",
    "abstain",
]
EvidenceKind = Literal["explicit", "inferred"]


class SourcedText(BaseModel):
    text: str
    sources: list[int] = []


class SummaryOut(BaseModel):
    title: str
    authors: list[str] = []
    publication_details: str | None = None
    abstract: SourcedText
    problem_statement: SourcedText
    methodology: SourcedText
    key_results: SourcedText
    limitations: SourcedText = Field(default_factory=lambda: SourcedText(text=""))
    conclusion: SourcedText
    future_work: SourcedText = Field(default_factory=lambda: SourcedText(text=""))
    terminology: SourcedText = Field(default_factory=lambda: SourcedText(text=""))


class SourceOut(BaseModel):
    page: int
    snippet: str
    paper_id: str | None = None
    chunk_id: int | None = None
    chunk_index: int | None = None


class ChatMessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    sources: list[SourceOut]
    grounding: Literal["evidence", "insufficient", "mixed"] = "evidence"
    interpretation: str | None = None
    warning: str | None = None


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    lang: ResponseLanguage = "auto"


class VerifyRequest(BaseModel):
    claim: str = Field(min_length=1, max_length=4000)
    lang: ResponseLanguage = "auto"


class EvidenceItem(BaseModel):
    page: int
    chunk_id: int | None = None
    snippet: str
    kind: EvidenceKind = "explicit"
    relation: str = ""


class VerifyOut(BaseModel):
    claim: str
    verdict: Verdict
    explanation: str
    evidence: list[EvidenceItem]
    disclaimer: str
    warning: str | None = None


class AgentRequest(BaseModel):
    task: str = Field(min_length=1, max_length=4000)
    lang: ResponseLanguage = "auto"
    paper_ids: list[str] | None = None
    approve_external: bool = False


class AgentStepOut(BaseModel):
    step_index: int
    tool: str
    arguments: dict = {}
    status: str
    result: dict | None = None
    error_message: str | None = None
    citations: list[SourceOut] = []


class AgentReportOut(BaseModel):
    findings: str
    citations: list[SourceOut] = []
    unresolved_questions: list[str] = []
    completed_steps: list[int] = []
    failed_steps: list[int] = []


class AgentRunOut(BaseModel):
    id: str
    paper_id: str
    task: str
    status: str
    lang: str
    allowed_paper_ids: list[str]
    plan: list[dict]
    steps: list[AgentStepOut]
    report: AgentReportOut | None = None
    error_message: str | None = None
    warning: str | None = None


class SuggestionOut(BaseModel):
    questions: list[str]


class QuizItem(BaseModel):
    question: str
    answer: str
    sources: list[int] = []


class QuizOut(BaseModel):
    items: list[QuizItem]
    disclaimer: str


class ScholarlyHit(BaseModel):
    provider: str
    title: str
    authors: list[str] = []
    publication_date: str | None = None
    doi: str | None = None
    source_url: str | None = None
    origin: Literal["external"] = "external"


class ScholarlySearchOut(BaseModel):
    query: str
    results: list[ScholarlyHit]
    warning: str | None = None


ConcernStatus = Literal[
    "potential_concern",
    "needs_verification",
    "evidence_gap",
    "author_acknowledged_limitation",
    "conflicting_evidence",
    "insufficient_evidence",
]


class ResearchConcernItem(BaseModel):
    id: str
    title: str
    category: str
    category_label: str
    description: str
    why_it_matters: str
    status: ConcernStatus
    status_label: str
    acknowledged_by_authors: bool
    page: int | None = None
    snippet: str | None = None
    confidence: str = "moderate"
    suggested_investigation: str = ""


class ConcernsReportOut(BaseModel):
    paper_id: str
    concerns: list[ResearchConcernItem] = []
    summary: str
    total_concerns: int
    author_acknowledged_count: int
    ai_identified_count: int
    disclaimer: str


class CompareRequest(BaseModel):
    paper_ids: list[str] = Field(min_length=2, max_length=10)
    focus_query: str | None = Field(default=None, max_length=1000)
    lang: ResponseLanguage = "auto"


class PaperProfileOut(BaseModel):
    paper_id: str
    title: str
    filename: str
    objectives: str
    methodology: str
    datasets: str
    findings: str
    limitations: str


class ComparisonSynthesisOut(BaseModel):
    agreements: list[str] = []
    disagreements: list[str] = []
    evidence_gaps: list[str] = []
    cross_citations: list[SourceOut] = []


class CompareOut(BaseModel):
    paper_ids: list[str]
    profiles: list[PaperProfileOut]
    synthesis: ComparisonSynthesisOut
    summary: str

