import type { Source } from "./types";

export type CitationSegment =
  { type: "text"; value: string } | { type: "citation"; pages: number[] };

const CITATION_RE = /\[\s*(?:pages?|pp?\.)\s*([\d\s,\-–—]+?)\s*\]/gi;

/** Expand "4–6, 9" into [4, 5, 6, 9]. */
export function expandPages(spec: string): number[] {
  const pages: number[] = [];
  for (const part of spec.split(",")) {
    const [a, b] = part.split(/[-–—]/).map((s) => parseInt(s.trim(), 10));
    if (a === undefined || Number.isNaN(a)) continue;
    if (b === undefined || Number.isNaN(b)) pages.push(a);
    else for (let p = Math.min(a, b); p <= Math.max(a, b); p++) pages.push(p);
  }
  return Array.from(new Set(pages));
}

/** Split plain API text into text and citation segments. */
export function parseCitations(text: string): CitationSegment[] {
  const segments: CitationSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(CITATION_RE)) {
    const pages = expandPages(match[1] ?? "");
    if (!pages.length) continue;
    const start = match.index ?? 0;
    if (start > last) segments.push({ type: "text", value: text.slice(last, start) });
    segments.push({ type: "citation", pages });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ type: "text", value: text.slice(last) });
  return segments;
}

/** [12, 13] -> "Pages 12–13"; [3] -> "Page 3"; [3, 5, 6, 7] -> "Pages 3, 5–7". */
export function formatPageRanges(pages: number[]): string {
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  if (!sorted.length) return "";
  const ranges: string[] = [];
  let start = sorted[0] as number;
  let prev = start;
  for (const p of [...sorted.slice(1), Infinity]) {
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = prev = p;
  }
  return `${sorted.length === 1 ? "Page" : "Pages"} ${ranges.join(", ")}`;
}

export function findSnippet(page: number, sources: Source[] | undefined = []): string | undefined {
  return sources.find((s) => s.page === page)?.snippet;
}
