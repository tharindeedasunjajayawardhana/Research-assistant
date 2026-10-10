import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusMessage } from "@/components/layout/StatusMessage";
import { useCitation } from "@/components/citation/CitationContext";
import { getConcerns, reanalyzeConcerns } from "@/lib/api";
import type { ConcernStatus, ResearchConcernItem, ResponseLanguage } from "@/lib/types";

interface Props {
  paperId: string;
  lang: ResponseLanguage;
}

const STATUS_CONFIG: Record<
  ConcernStatus,
  { label: string; badgeClass: string; icon: typeof AlertCircle }
> = {
  potential_concern: {
    label: "Potential Concern",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    icon: AlertTriangle,
  },
  needs_verification: {
    label: "Needs Verification",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    icon: HelpCircle,
  },
  evidence_gap: {
    label: "Evidence Gap",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    icon: Search,
  },
  author_acknowledged_limitation: {
    label: "Author-Acknowledged Limitation",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    icon: CheckCircle2,
  },
  conflicting_evidence: {
    label: "Conflicting Evidence",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    icon: ShieldAlert,
  },
  insufficient_evidence: {
    label: "Insufficient Evidence",
    badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20",
    icon: Info,
  },
};

export function ConcernsTab({ paperId, lang }: Props) {
  const queryClient = useQueryClient();
  const { openCitation } = useCitation();
  const [filter, setFilter] = useState<"all" | "author" | "ai" | "needs_action">("all");

  const queryKey = ["concerns", paperId, lang];
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getConcerns(paperId, lang),
    staleTime: 5 * 60_000,
  });

  const reanalyze = useMutation({
    mutationFn: () => reanalyzeConcerns(paperId, lang),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
    },
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-3xl border bg-card p-6" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-48 animate-pulse rounded-2xl border bg-card p-6" />
          <div className="h-48 animate-pulse rounded-2xl border bg-card p-6" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-3xl border bg-card shadow-soft">
        <StatusMessage
          tone="error"
          icon={AlertCircle}
          title="Could not evaluate research concerns."
          description={error instanceof Error ? error.message : "Please try again."}
          action={
            <Button onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="size-4" aria-hidden />
              Retry Analysis
            </Button>
          }
        />
      </div>
    );
  }

  const allConcerns = data.concerns || [];
  const filtered = allConcerns.filter((c) => {
    if (filter === "author") return c.acknowledged_by_authors;
    if (filter === "ai") return !c.acknowledged_by_authors;
    if (filter === "needs_action")
      return c.status === "needs_verification" || c.status === "potential_concern";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" aria-hidden />
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Research Concerns & Evidence Alerts
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{data.summary}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => reanalyze.mutate()}
            disabled={reanalyze.isPending}
            className="self-start rounded-xl sm:self-center"
          >
            <RefreshCw
              className={`size-3.5 ${reanalyze.isPending ? "animate-spin" : ""}`}
              aria-hidden
            />
            {reanalyze.isPending ? "Re-analyzing…" : "Re-evaluate Paper"}
          </Button>
        </div>

        {/* Stats strip */}
        <div className="mt-6 flex flex-wrap gap-4 border-t pt-4 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-muted-foreground">Total Evaluated Points:</span>
            <span className="font-semibold">{data.total_concerns}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden />
            <span>Author-Acknowledged:</span>
            <span className="font-semibold">{data.author_acknowledged_count}</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
            <Sparkles className="size-3.5" aria-hidden />
            <span>AI-Identified Potential Alerts:</span>
            <span className="font-semibold">{data.ai_identified_count}</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>{data.disclaimer}</p>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => setFilter("all")}
        >
          All ({allConcerns.length})
        </Button>
        <Button
          variant={filter === "author" ? "default" : "outline"}
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => setFilter("author")}
        >
          Author-Acknowledged ({data.author_acknowledged_count})
        </Button>
        <Button
          variant={filter === "ai" ? "default" : "outline"}
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => setFilter("ai")}
        >
          AI-Identified ({data.ai_identified_count})
        </Button>
        <Button
          variant={filter === "needs_action" ? "default" : "outline"}
          size="sm"
          className="rounded-xl text-xs"
          onClick={() => setFilter("needs_action")}
        >
          Needs Verification
        </Button>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border bg-card p-10 text-center shadow-soft">
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" aria-hidden />
          <h3 className="mt-3 font-semibold">No concerns matched this filter</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No items were flagged under this specific category during automated checks.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((concern: ResearchConcernItem, index: number) => {
            const statusCfg = STATUS_CONFIG[concern.status] || STATUS_CONFIG.potential_concern;
            const StatusIcon = statusCfg.icon;

            return (
              <motion.article
                key={concern.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.04 }}
                className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-soft transition hover:border-primary/30"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`gap-1 text-[11px] ${statusCfg.badgeClass}`}
                    >
                      <StatusIcon className="size-3" aria-hidden />
                      {statusCfg.label}
                    </Badge>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {concern.category_label}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-semibold tracking-tight text-balance">
                    {concern.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                    {concern.description}
                  </p>

                  <div className="mt-3 rounded-xl bg-muted/40 p-3 text-xs">
                    <span className="font-semibold text-muted-foreground">Why it matters: </span>
                    <span className="text-foreground/80">{concern.why_it_matters}</span>
                  </div>

                  {concern.snippet && (
                    <div className="mt-3 border-l-2 border-primary/30 pl-3">
                      <p className="text-xs italic text-muted-foreground">
                        &ldquo;{concern.snippet}&rdquo;
                      </p>
                      {concern.page && (
                        <button
                          type="button"
                          onClick={() =>
                            openCitation({
                              page: concern.page as number,
                              snippet: concern.snippet || "",
                            })
                          }
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                        >
                          <span>Page {concern.page} citation</span>
                          <ExternalLink className="size-3" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span>
                      Origin:{" "}
                      <strong className="font-medium text-foreground">
                        {concern.acknowledged_by_authors ? "Author Acknowledged" : "AI Identified"}
                      </strong>
                    </span>
                    <span>
                      Confidence:{" "}
                      <strong className="capitalize text-foreground">{concern.confidence}</strong>
                    </span>
                  </div>

                  {concern.suggested_investigation && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">Suggested investigation: </span>
                      {concern.suggested_investigation}
                    </p>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
