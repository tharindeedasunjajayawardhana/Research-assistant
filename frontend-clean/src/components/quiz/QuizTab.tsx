import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCitation } from "@/components/citation/CitationContext";
import { getQuiz } from "@/lib/api";
import type { QuizItem, QuizReport, ResponseLanguage } from "@/lib/types";

interface Props {
  paperId: string;
  lang: ResponseLanguage;
}

export function QuizTab({ paperId, lang }: Props) {
  const { openCitation } = useCitation();
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const quizMutation = useMutation<QuizReport, Error, void>({
    mutationFn: () => getQuiz(paperId, lang),
  });

  const toggleReveal = (idx: number) => {
    setRevealed((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const data = quizMutation.data;

  return (
    <div className="space-y-6">
      {/* Intro card */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <GraduationCap className="size-5 text-primary" aria-hidden />
              <h2 className="text-xl font-semibold tracking-tight">Study & Comprehension Quiz</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate grounded study questions with explanations and source citations to test your
              understanding of this research paper.
            </p>
          </div>
          <Button
            onClick={() => quizMutation.mutate()}
            disabled={quizMutation.isPending}
            className="rounded-xl gap-2 self-start sm:self-center"
          >
            {quizMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Generating Questions…
              </>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden />
                {data ? "Regenerate Quiz" : "Generate Study Quiz"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {quizMutation.isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            <p className="font-semibold text-sm">Failed to generate study questions</p>
          </div>
          <p className="mt-1 text-xs">{quizMutation.error.message}</p>
        </div>
      )}

      {/* Quiz questions */}
      {data && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{data.disclaimer}</p>

          <div className="space-y-3">
            {data.items.map((item: QuizItem, idx: number) => {
              const isOpen = !!revealed[idx];

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-2xl border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-foreground">{item.question}</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleReveal(idx)}
                      className="h-8 gap-1 rounded-lg text-xs"
                    >
                      <span>{isOpen ? "Hide Answer" : "Reveal Answer"}</span>
                      {isOpen ? (
                        <ChevronUp className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3.5" aria-hidden />
                      )}
                    </Button>
                  </div>

                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 border-t pt-3 text-xs leading-relaxed space-y-2"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="size-3.5" aria-hidden />
                        <span>Explanation & Grounded Answer:</span>
                      </div>
                      <p className="text-foreground/90 pl-5">{item.answer}</p>

                      {item.sources && item.sources.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pl-5 pt-1">
                          <span className="text-[11px] text-muted-foreground">Supported on:</span>
                          {item.sources.map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => openCitation({ page, snippet: item.answer })}
                              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-primary hover:underline"
                            >
                              <span>Page {page}</span>
                              <ExternalLink className="size-2.5" aria-hidden />
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
