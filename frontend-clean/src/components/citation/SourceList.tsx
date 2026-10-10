import type { Source } from "@/lib/types";
import { CitationChip } from "./CitationChip";

interface Props {
  pages: number[];
  sources?: Source[] | undefined;
  label?: "full" | "number" | undefined;
  emptyText?: string | undefined;
}

export function SourceList({ pages, sources, label = "full", emptyText }: Props) {
  return (
    <div className="mt-4 border-t pt-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sources
      </h4>
      {pages.length ? (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Source pages">
          {pages.map((p) => (
            <li key={p}>
              <CitationChip page={p} sources={sources} label={label} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}
