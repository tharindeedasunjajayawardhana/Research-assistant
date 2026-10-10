import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Compass,
  FlaskConical,
  Lightbulb,
  ListChecks,
  RotateCcw,
  ScrollText,
  Target,
  BookMarked,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusMessage } from "@/components/layout/StatusMessage";
import { useSummary } from "@/hooks/useSummary";
import { ApiError } from "@/lib/api";
import type { ResponseLanguage, Summary } from "@/lib/types";
import { SummaryCard } from "./SummaryCard";
import { SummarySkeleton } from "./SummarySkeleton";

const SECTIONS: {
  key: keyof Omit<Summary, "title" | "authors" | "publication_details">;
  title: string;
  icon: typeof Target;
  wide?: boolean;
}[] = [
  { key: "abstract", title: "Paper Overview / Abstract", icon: ScrollText, wide: true },
  { key: "problem_statement", title: "Problem Statement & Motivation", icon: Target },
  { key: "methodology", title: "Methodology & Setup", icon: FlaskConical },
  { key: "key_results", title: "Key Results & Quantitative Findings", icon: ListChecks },
  { key: "limitations", title: "Limitations & Constraints", icon: AlertTriangle },
  { key: "conclusion", title: "Conclusion & Contributions", icon: Lightbulb },
  { key: "future_work", title: "Future Work & Open Directions", icon: Compass, wide: true },
  { key: "terminology", title: "Important Terminology", icon: BookMarked, wide: true },
];

export function SummaryTab({ paperId, lang }: { paperId: string; lang: ResponseLanguage }) {
  const { data, isPending, isError, error, refetch, isRefetching } = useSummary(paperId, lang);

  if (isPending) return <SummarySkeleton />;
  if (isError || !data)
    return (
      <div className="rounded-3xl border bg-card shadow-soft">
        <StatusMessage
          tone="error"
          icon={AlertCircle}
          title="We couldn't generate the summary."
          description={error instanceof ApiError ? error.message : "Please try again."}
          action={
            <Button onClick={() => refetch()} disabled={isRefetching} className="rounded-xl">
              <RotateCcw className="size-4" aria-hidden />
              Retry
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="space-y-4">
      <motion.header
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative overflow-hidden rounded-3xl border bg-card p-7 shadow-soft sm:p-9"
      >
        <div className="pointer-events-none absolute inset-0 bg-hero-glow opacity-70" aria-hidden />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-brown dark:text-sage">
              Paper Overview
            </p>
            {data.publication_details && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {data.publication_details}
              </span>
            )}
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {data.title}
          </h2>
          {(() => {
            const authorsList = Array.isArray(data.authors)
              ? data.authors
              : typeof data.authors === "string"
                ? [data.authors]
                : [];
            return authorsList.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Authors">
                {authorsList.map((a) => (
                  <li
                    key={a}
                    className="rounded-lg border bg-background/70 px-2.5 py-1 text-sm text-muted-foreground"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            ) : null;
          })()}
        </div>
      </motion.header>
      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s, i) => {
          const content = data[s.key] ?? {
            text: "Not explicitly established from the available excerpts.",
            sources: [],
          };
          return (
            <div key={s.key} className={s.wide ? "md:col-span-2" : undefined}>
              <SummaryCard title={s.title} icon={s.icon} content={content} index={i + 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
