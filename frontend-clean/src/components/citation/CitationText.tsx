import { Fragment, useMemo } from "react";
import { parseCitations } from "@/lib/citations";
import type { Source } from "@/lib/types";
import { CitationChip } from "./CitationChip";

/** Renders plain API text, turning [Page N] / [Pages A–B] markers into chips. */
export function CitationText({
  text,
  sources,
}: {
  text?: string | null;
  sources?: Source[] | undefined;
}) {
  const safeText = text ?? "";
  const paragraphs = useMemo(
    () => safeText.split(/\n{2,}/).map((p) => parseCitations(p)),
    [safeText],
  );
  return (
    <>
      {paragraphs.map((segments, i) => (
        <p key={i} className="[&:not(:first-child)]:mt-3">
          {segments.map((seg, j) =>
            seg.type === "text" ? (
              <Fragment key={j}>{seg.value}</Fragment>
            ) : (
              <span key={j} className="inline-flex flex-wrap gap-1 align-baseline">
                {seg.pages.map((page) => (
                  <CitationChip
                    key={page}
                    page={page}
                    sources={sources}
                    label={seg.pages.length > 1 ? "number" : "full"}
                  />
                ))}
              </span>
            ),
          )}
        </p>
      ))}
    </>
  );
}
