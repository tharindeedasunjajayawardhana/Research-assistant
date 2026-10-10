import { FileText } from "lucide-react";
import type { Source } from "@/lib/types";
import { findSnippet } from "@/lib/citations";
import { cn } from "@/lib/utils";
import { useCitation } from "./CitationContext";

interface Props {
  page: number;
  sources?: Source[] | undefined;
  /** "full" shows "Page 5", "number" shows "5". */
  label?: "full" | "number" | undefined;
  className?: string | undefined;
}

export function CitationChip({ page, sources, label = "full", className }: Props) {
  const { openCitation } = useCitation();
  return (
    <button
      type="button"
      onClick={() => openCitation({ page, snippet: findSnippet(page, sources) })}
      aria-label={`View source on page ${page}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary-soft px-1.5 py-0.5 align-baseline text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <FileText className="size-3" aria-hidden />
      {label === "full" ? `Page ${page}` : page}
    </button>
  );
}
