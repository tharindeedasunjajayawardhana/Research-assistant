/**
 * Isolated development mock. Never selected in production builds.
 * Enable only with VITE_USE_MOCK=true while running `npm run dev`.
 */
import type {
  AgentRun,
  ChatMessage,
  CompareResult,
  ConcernsReport,
  Paper,
  PaperNote,
  QuizReport,
  ResponseLanguage,
  ScholarlySearch,
  Summary,
  VerifyResult,
} from "./types";

const delay = (min = 400, max = 800) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));

const MOCK_PAPER: Paper = {
  id: "aiayn-7f3a2c",
  filename: "attention-is-all-you-need-ja.pdf",
  language: "ja",
  language_name: "Japanese",
  page_count: 18,
  status: "ready",
  low_text_pages: [12, 13],
  created_at: new Date().toISOString(),
};

export const mockApi = {
  listPapers: async (): Promise<Paper[]> => {
    await delay();
    return [MOCK_PAPER];
  },
  deletePaper: async (_id: string): Promise<void> => {
    await delay();
  },
  reprocessPaper: async (_id: string): Promise<Paper> => {
    await delay();
    return MOCK_PAPER;
  },
  uploadPaper: async (_file: File, onProgress: (pct: number) => void): Promise<Paper> => {
    for (const pct of [0, 25, 50, 75, 100]) {
      onProgress(pct);
      await delay(80, 150);
    }
    return MOCK_PAPER;
  },
  getPaper: async (id: string): Promise<Paper> => {
    await delay();
    return { ...MOCK_PAPER, id };
  },
  getSummary: async (_id: string, _lang: ResponseLanguage): Promise<Summary> => {
    await delay();
    return {
      title: "Attention Is All You Need",
      authors: ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"],
      publication_details: "NeurIPS 2017",
      abstract: {
        text: "The paper introduces the Transformer, a sequence transduction architecture built entirely on attention mechanisms, dispensing with recurrence and convolutions.",
        sources: [1],
      },
      problem_statement: {
        text: "Dominant sequence models rely on recurrent networks that preclude parallelization within training examples.",
        sources: [1, 2],
      },
      methodology: {
        text: "The Transformer follows an encoder-decoder structure with multi-head scaled dot-product attention.",
        sources: [3, 4],
      },
      key_results: {
        text: "The big Transformer reaches 28.4 BLEU on English-to-German and 41.8 BLEU on English-to-French.",
        sources: [7, 8],
      },
      limitations: {
        text: "Self-attention has quadratic O(n^2) complexity with sequence length.",
        sources: [6],
      },
      conclusion: {
        text: "Attention-only models can be trained substantially faster while achieving superior quality.",
        sources: [10],
      },
      future_work: {
        text: "Extending attention models to images, audio, video, and restricted local attention.",
        sources: [10],
      },
    };
  },
  exportSummaryMarkdown: async (_id: string, _lang: ResponseLanguage): Promise<string> => {
    return "# Attention Is All You Need\n\nSummary report...";
  },
  sendChat: async (
    _id: string,
    question: string,
    _lang: ResponseLanguage,
  ): Promise<ChatMessage> => {
    await delay();
    return {
      id: "mock-msg-" + Date.now(),
      role: "assistant",
      content: `Based on the paper excerpts, this question relates to the Transformer architecture: "${question}" [Page 3].`,
      sources: [{ page: 3, snippet: "The Transformer follows stacked self-attention." }],
    };
  },
  getChatHistory: async (_id: string): Promise<ChatMessage[]> => {
    await delay();
    return [];
  },
  getSuggestions: async (_id: string): Promise<string[]> => {
    return [
      "What problem does this paper address?",
      "What method or approach do the authors propose?",
      "What results or evidence are reported?",
      "What limitations are acknowledged by the authors?",
    ];
  },
  getConcerns: async (id: string, _lang: ResponseLanguage): Promise<ConcernsReport> => {
    await delay();
    return {
      paper_id: id,
      total_concerns: 2,
      author_acknowledged_count: 1,
      ai_identified_count: 1,
      summary: "Identified quadratic complexity and missing baseline tests for long contexts.",
      disclaimer: "AI-assisted critical reading alerts based on retrieved excerpts.",
      concerns: [
        {
          id: "c1",
          title: "Quadratic Complexity with Sequence Length",
          category: "methodological_weakness",
          category_label: "Methodological Design",
          description: "Full self-attention requires O(n^2) computational complexity.",
          why_it_matters: "Restricts input context length on hardware with limited GPU VRAM.",
          status: "author_acknowledged_limitation",
          status_label: "Author-Acknowledged Limitation",
          acknowledged_by_authors: true,
          page: 6,
          snippet:
            "Self-attention layers connect all positions with a constant number of sequentially executed operations.",
          confidence: "high",
          suggested_investigation:
            "Did the authors evaluate sparse attention or chunked attention?",
        },
      ],
    };
  },
  reanalyzeConcerns: async (id: string, lang: ResponseLanguage) => mockApi.getConcerns(id, lang),
  verifyClaim: async (
    _id: string,
    claim: string,
    _lang: ResponseLanguage,
  ): Promise<VerifyResult> => {
    await delay();
    return {
      claim,
      verdict: "supported",
      explanation: "The claim is supported by empirical evaluation results in Table 2.",
      evidence: [
        {
          page: 8,
          snippet: "The big model achieves 28.4 BLEU score on WMT 2014 English-to-German.",
          kind: "explicit",
        },
      ],
      disclaimer: "AI-assisted verification, not definitive scientific peer review.",
    };
  },
  startAgent: async (
    id: string,
    task: string,
    _lang: ResponseLanguage,
    _paperIds?: string[],
    _approveExternal = false,
  ): Promise<AgentRun> => {
    await delay();
    return {
      id: "agent-" + Date.now(),
      paper_id: id,
      task,
      status: "completed",
      lang: "auto",
      allowed_paper_ids: [id],
      plan: [{ tool: "search_paper" }, { tool: "produce_report" }],
      steps: [
        {
          step_index: 0,
          tool: "search_paper",
          arguments: { query: task },
          status: "completed",
          citations: [{ page: 2, snippet: "Relevant passage." }],
        },
      ],
      report: {
        findings: "Findings derived from evidence in the paper.",
        citations: [{ page: 2, snippet: "Relevant passage." }],
        unresolved_questions: [],
        completed_steps: [0],
        failed_steps: [],
      },
    };
  },
  getAgentRun: async (id: string, _runId: string): Promise<AgentRun> => {
    return mockApi.startAgent(id, "Research task", "auto");
  },
  comparePapers: async (paperIds: string[]): Promise<CompareResult> => {
    await delay();
    return {
      paper_ids: paperIds,
      profiles: paperIds.map((id) => ({
        paper_id: id,
        title: `Paper ${id}`,
        filename: `${id}.pdf`,
        objectives: "Core objective",
        methodology: "Transformer architecture",
        datasets: "WMT benchmark",
        findings: "Competitive BLEU score",
        limitations: "Memory bounds",
      })),
      synthesis: {
        agreements: ["Both papers rely on deep attention mechanisms."],
        disagreements: ["Different hardware training budgets were employed."],
        evidence_gaps: ["Neither paper tests out-of-domain conversational data."],
        cross_citations: [],
      },
      summary: "Comparison summary across selected documents.",
    };
  },
  listNotes: async (_id: string): Promise<PaperNote[]> => {
    await delay();
    return [];
  },
  createNote: async (
    id: string,
    note: { page_no?: number | null; chunk_id?: number | null; excerpt?: string; body: string },
  ): Promise<PaperNote> => {
    await delay();
    return {
      id: "note-" + Date.now(),
      paper_id: id,
      page_no: note.page_no ?? null,
      chunk_id: note.chunk_id ?? null,
      excerpt: note.excerpt || "",
      body: note.body,
      created_at: new Date().toISOString(),
    };
  },
  deleteNote: async (_id: string, _noteId: string): Promise<void> => {
    await delay();
  },
  getQuiz: async (_id: string, _lang: ResponseLanguage): Promise<QuizReport> => {
    await delay();
    return {
      disclaimer: "Study questions derived from paper passages.",
      items: [
        {
          question: "What is the primary advantage of self-attention over recurrent networks?",
          answer: "It allows all positions to be computed in parallel, reducing training time.",
          sources: [2, 3],
        },
      ],
    };
  },
  getScholarly: async (_id: string, query: string): Promise<ScholarlySearch> => {
    await delay();
    return {
      query,
      results: [
        {
          provider: "openalex",
          title: "Attention Is All You Need",
          authors: ["Ashish Vaswani", "Noam Shazeer"],
          publication_date: "2017-06-12",
          doi: "https://doi.org/10.48550/arxiv.1706.03762",
          source_url: "https://openalex.org/W2963403868",
          origin: "external",
        },
      ],
    };
  },
};
