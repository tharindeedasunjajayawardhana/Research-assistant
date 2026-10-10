// All application/domain types live here. Mirrors the FastAPI backend contract.

export type Language = "ja" | "en" | "si" | "zh" | "es" | "fr" | "de" | "other";

export type ResponseLanguage = "auto" | "en" | "ja" | "si" | "zh" | "es" | "fr" | "de";

export interface Paper {
  id: string;
  filename: string;
  title?: string | null;
  author?: string | null;
  year?: string | null;
  language: Language;
  language_name: string;
  language_confidence?: number | null;
  language_supported?: boolean;
  page_count: number;
  status: "processing" | "ready" | "failed";
  low_text_pages: number[];
  error_message?: string | null;
  embedding_model?: string | null;
  ocr_status?: string;
  ocr_message?: string | null;
  extraction_warnings?: string[];
  created_at?: string;
}

export interface SourcedText {
  text: string;
  sources: number[];
}

export interface Summary {
  title: string;
  authors: string[];
  publication_details?: string | null;
  abstract: SourcedText;
  problem_statement: SourcedText;
  methodology: SourcedText;
  key_results: SourcedText;
  limitations?: SourcedText;
  conclusion: SourcedText;
  future_work?: SourcedText;
  terminology?: SourcedText;
}

export interface Source {
  page: number;
  snippet: string;
  paper_id?: string | null;
  chunk_id?: number | null;
  chunk_index?: number | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  grounding?: "evidence" | "insufficient" | "mixed";
  interpretation?: string | null;
  warning?: string | null;
}

export type ConcernStatus =
  | "potential_concern"
  | "needs_verification"
  | "evidence_gap"
  | "author_acknowledged_limitation"
  | "conflicting_evidence"
  | "insufficient_evidence";

export interface ResearchConcernItem {
  id: string;
  title: string;
  category: string;
  category_label: string;
  description: string;
  why_it_matters: string;
  status: ConcernStatus;
  status_label: string;
  acknowledged_by_authors: boolean;
  page?: number | null;
  snippet?: string | null;
  confidence: string;
  suggested_investigation: string;
}

export interface ConcernsReport {
  paper_id: string;
  concerns: ResearchConcernItem[];
  summary: string;
  total_concerns: number;
  author_acknowledged_count: number;
  ai_identified_count: number;
  disclaimer: string;
  cached?: boolean | null;
}

export type Verdict =
  "supported" | "contradicted" | "partially_supported" | "insufficient_evidence" | "abstain";

export interface EvidenceItem {
  page: number;
  chunk_id?: number | null;
  snippet: string;
  kind: "explicit" | "inferred";
  relation?: string;
}

export interface VerifyResult {
  claim: string;
  verdict: Verdict;
  confidence?: string | null;
  explanation: string;
  evidence: EvidenceItem[];
  disclaimer: string;
  warning?: string | null;
}

export interface AgentStep {
  step_index: number;
  tool: string;
  arguments: Record<string, unknown>;
  status: "pending" | "completed" | "failed" | "blocked" | "skipped";
  result?: Record<string, unknown> | null;
  error_message?: string | null;
  citations: Source[];
}

export interface AgentReport {
  findings: string;
  citations: Source[];
  unresolved_questions: string[];
  completed_steps: number[];
  failed_steps: number[];
}

export interface AgentRun {
  id: string;
  paper_id: string;
  task: string;
  status: "planning" | "running" | "completed" | "failed";
  lang: string;
  allowed_paper_ids: string[];
  plan: { tool: string; args?: Record<string, unknown> }[];
  steps: AgentStep[];
  report?: AgentReport | null;
  error_message?: string | null;
  warning?: string | null;
}

export interface PaperNote {
  id: string;
  paper_id: string;
  page_no?: number | null;
  chunk_id?: number | null;
  excerpt: string;
  body: string;
  created_at?: string;
}

export interface QuizItem {
  question: string;
  answer: string;
  sources: number[];
}

export interface QuizReport {
  items: QuizItem[];
  disclaimer: string;
}

export interface ScholarlyHit {
  provider: string;
  title: string;
  authors: string[];
  publication_date?: string | null;
  doi?: string | null;
  source_url?: string | null;
  origin: "external";
}

export interface ScholarlySearch {
  query: string;
  results: ScholarlyHit[];
  warning?: string | null;
}

export interface PaperProfile {
  paper_id: string;
  title: string;
  filename: string;
  objectives: string;
  methodology: string;
  datasets: string;
  findings: string;
  limitations: string;
}

export interface ComparisonSynthesis {
  agreements: string[];
  disagreements: string[];
  evidence_gaps: string[];
  cross_citations: Source[];
}

export interface CompareResult {
  paper_ids: string[];
  profiles: PaperProfile[];
  synthesis: ComparisonSynthesis;
  summary: string;
}
