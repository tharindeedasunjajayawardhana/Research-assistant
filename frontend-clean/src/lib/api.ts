/**
 * The single data-access boundary of the app.
 * Components → hooks → this file → FastAPI backend.
 *
 * Development-only mocks live in api.mock.ts and cannot be selected in production builds.
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
import { mockApi } from "./api.mock";

export const USE_MOCK = import.meta.env.DEV && import.meta.env["VITE_USE_MOCK"] === "true";

const API_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 300_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function messageFromApiDetail(detail: unknown): string | null {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: unknown };
    if (typeof first?.msg === "string" && first.msg.trim()) return first.msg;
  }
  return null;
}

async function errorFromResponse(res: Response): Promise<ApiError> {
  let message = "The research service returned an error.";
  try {
    const body = (await res.json()) as { detail?: unknown };
    message = messageFromApiDetail(body.detail) ?? message;
  } catch {
    // keep the generic message
  }
  return new ApiError(message, res.status);
}

async function parseJson<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }
  const text = await res.text();
  if (!text.trim()) {
    return undefined as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError("The research service returned an unexpected response.", res.status);
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (init?.signal) {
    if (init.signal.aborted) controller.abort();
    else init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("The research service took too long to respond.");
    }
    throw new ApiError("We couldn't reach the research service. Is the backend running?");
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw await errorFromResponse(res);
  return parseJson<T>(res);
}

const realApi = {
  listPapers: () => request<Paper[]>("/papers"),

  deletePaper: (id: string) =>
    request<void>(`/papers/${encodeURIComponent(id)}`, { method: "DELETE" }),

  getPaper: (id: string) => request<Paper>(`/papers/${encodeURIComponent(id)}`),

  reprocessPaper: (id: string) =>
    request<Paper>(`/papers/${encodeURIComponent(id)}/reprocess`, { method: "POST" }),

  uploadPaper(file: File, onProgress: (pct: number) => void): Promise<Paper> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const body = new FormData();
      body.append("file", file);
      xhr.open("POST", `${API_URL}/papers`);
      xhr.timeout = UPLOAD_TIMEOUT_MS;
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          try {
            resolve(JSON.parse(xhr.responseText) as Paper);
          } catch {
            reject(
              new ApiError("The research service returned an unexpected response.", xhr.status),
            );
          }
        } else {
          let message = "Upload failed.";
          try {
            const parsed = JSON.parse(xhr.responseText) as { detail?: unknown };
            message = messageFromApiDetail(parsed.detail) ?? message;
          } catch {
            // keep the default message
          }
          reject(new ApiError(message, xhr.status));
        }
      };
      xhr.ontimeout = () => reject(new ApiError("The upload took too long to complete."));
      xhr.onerror = () => reject(new ApiError("We couldn't reach the research service."));
      xhr.send(body);
    });
  },

  getSummary: (id: string, lang: ResponseLanguage) =>
    request<Summary>(`/papers/${encodeURIComponent(id)}/summary?lang=${encodeURIComponent(lang)}`),

  exportSummaryMarkdown: async (id: string, lang: ResponseLanguage): Promise<string> => {
    let res: Response;
    try {
      res = await fetch(
        `${API_URL}/papers/${encodeURIComponent(id)}/export?lang=${encodeURIComponent(lang)}`,
      );
    } catch {
      throw new ApiError("Could not download report export.");
    }
    if (!res.ok) throw await errorFromResponse(res);
    return res.text();
  },

  sendChat: (id: string, question: string, lang: ResponseLanguage) =>
    request<ChatMessage>(
      `/papers/${encodeURIComponent(id)}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, lang }),
      },
      120_000,
    ),

  getChatHistory: (id: string) =>
    request<ChatMessage[]>(`/papers/${encodeURIComponent(id)}/chat/messages`),

  getSuggestions: async (id: string): Promise<string[]> => {
    const res = await request<{ questions: string[] }>(
      `/papers/${encodeURIComponent(id)}/suggestions`,
    );
    return res.questions;
  },

  getConcerns: (id: string, lang: ResponseLanguage) =>
    request<ConcernsReport>(
      `/papers/${encodeURIComponent(id)}/concerns?lang=${encodeURIComponent(lang)}`,
    ),

  reanalyzeConcerns: (id: string, lang: ResponseLanguage) =>
    request<ConcernsReport>(
      `/papers/${encodeURIComponent(id)}/concerns/analyze?lang=${encodeURIComponent(lang)}`,
      {
        method: "POST",
      },
    ),

  verifyClaim: (id: string, claim: string, lang: ResponseLanguage) =>
    request<VerifyResult>(`/papers/${encodeURIComponent(id)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim, lang }),
    }),

  startAgent: (
    id: string,
    task: string,
    lang: ResponseLanguage,
    paperIds?: string[],
    approveExternal = false,
  ) =>
    request<AgentRun>(
      `/papers/${encodeURIComponent(id)}/agent/runs`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          lang,
          paper_ids: paperIds,
          approve_external: approveExternal,
        }),
      },
      180_000,
    ),

  getAgentRun: (id: string, runId: string) =>
    request<AgentRun>(`/papers/${encodeURIComponent(id)}/agent/runs/${encodeURIComponent(runId)}`),

  comparePapers: (paperIds: string[], focusQuery?: string, lang: ResponseLanguage = "auto") =>
    request<CompareResult>("/papers/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paper_ids: paperIds, focus_query: focusQuery, lang }),
    }),

  listNotes: (id: string) => request<PaperNote[]>(`/papers/${encodeURIComponent(id)}/notes`),

  createNote: (
    id: string,
    note: { page_no?: number | null; chunk_id?: number | null; excerpt?: string; body: string },
  ) =>
    request<PaperNote>(`/papers/${encodeURIComponent(id)}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(note),
    }),

  deleteNote: (id: string, noteId: string) =>
    request<void>(`/papers/${encodeURIComponent(id)}/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
    }),

  getQuiz: (id: string, lang: ResponseLanguage) =>
    request<QuizReport>(`/papers/${encodeURIComponent(id)}/quiz?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
    }),

  getScholarly: (id: string, query: string) =>
    request<ScholarlySearch>(
      `/papers/${encodeURIComponent(id)}/scholarly?q=${encodeURIComponent(query)}`,
    ),
};

const api = USE_MOCK ? mockApi : realApi;

export const listPapers = () => api.listPapers();
export const deletePaper = (id: string) => api.deletePaper(id);
export const getPaper = (id: string) => api.getPaper(id);
export const reprocessPaper = (id: string) => api.reprocessPaper(id);
export const uploadPaper = (file: File, onProgress: (pct: number) => void) =>
  api.uploadPaper(file, onProgress);
export const getSummary = (id: string, lang: ResponseLanguage) => api.getSummary(id, lang);
export const exportSummaryMarkdown = (id: string, lang: ResponseLanguage) =>
  api.exportSummaryMarkdown(id, lang);
export const sendChat = (id: string, question: string, lang: ResponseLanguage) =>
  api.sendChat(id, question, lang);
export const getChatHistory = (id: string) => api.getChatHistory(id);
export const getSuggestions = (id: string) => api.getSuggestions(id);
export const getConcerns = (id: string, lang: ResponseLanguage) => api.getConcerns(id, lang);
export const reanalyzeConcerns = (id: string, lang: ResponseLanguage) =>
  api.reanalyzeConcerns(id, lang);
export const verifyClaim = (id: string, claim: string, lang: ResponseLanguage) =>
  api.verifyClaim(id, claim, lang);
export const startAgent = (
  id: string,
  task: string,
  lang: ResponseLanguage,
  paperIds?: string[],
  approveExternal = false,
) => api.startAgent(id, task, lang, paperIds, approveExternal);
export const getAgentRun = (id: string, runId: string) => api.getAgentRun(id, runId);
export const comparePapers = (
  paperIds: string[],
  focusQuery?: string,
  lang: ResponseLanguage = "auto",
) => api.comparePapers(paperIds, focusQuery, lang);
export const listNotes = (id: string) => api.listNotes(id);
export const createNote = (
  id: string,
  note: { page_no?: number | null; chunk_id?: number | null; excerpt?: string; body: string },
) => api.createNote(id, note);
export const deleteNote = (id: string, noteId: string) => api.deleteNote(id, noteId);
export const getQuiz = (id: string, lang: ResponseLanguage) => api.getQuiz(id, lang);
export const getScholarly = (id: string, query: string) => api.getScholarly(id, query);
