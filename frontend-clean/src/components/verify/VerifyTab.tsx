import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Info,
  Loader2,
  Search,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCitation } from "@/components/citation/CitationContext";
import { verifyClaim } from "@/lib/api";
import type { ResponseLanguage, Verdict, VerifyResult } from "@/lib/types";

interface Props {
  paperId: string;
  lang: ResponseLanguage;
}

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  supported: {
    label: "Supported by Paper",
    bg: "bg-emerald-500/10 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  contradicted: {
    label: "Contradicted by Paper",
    bg: "bg-rose-500/10 dark:bg-rose-950/30",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-500/30",
    icon: XCircle,
  },
  partially_supported: {
    label: "Partially Supported",
    bg: "bg-amber-500/10 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    icon: AlertTriangle,
  },
  insufficient_evidence: {
    label: "Insufficient Evidence in Paper",
    bg: "bg-slate-500/10 dark:bg-slate-900/30",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-500/30",
    icon: HelpCircle,
  },
  abstain: {
    label: "Ambiguous / Inconclusive Evidence",
    bg: "bg-blue-500/10 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    icon: Info,
  },
};

export function VerifyTab({ paperId, lang }: Props) {
  const { openCitation } = useCitation();
  const [claim, setClaim] = useState("");

  const verify = useMutation<VerifyResult, Error, string>({
    mutationFn: (text: string) => verifyClaim(paperId, text, lang),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!claim.trim()) return;
    verify.mutate(claim.trim());
  };

  const setSample = (sample: string) => {
    setClaim(sample);
    verify.mutate(sample);
  };

  const result = verify.data;

  return (
    <div className="space-y-6">
      {/* Submit Claim Card */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2">
          <Search className="size-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">Claim Verification</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit any specific assertion or scientific claim to check whether it is supported,
          contradicted, or unaddressed by this paper.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            value={claim}
            onChange={(e) => setClaim(e.target.value)}
            placeholder="e.g. The proposed architecture eliminates recurrent connections entirely."
            className="h-11 rounded-xl text-sm"
            disabled={verify.isPending}
          />
          <Button
            type="submit"
            disabled={!claim.trim() || verify.isPending}
            className="h-11 rounded-xl px-6"
          >
            {verify.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Verifying…
              </>
            ) : (
              "Verify Claim"
            )}
          </Button>
        </form>

        {/* Quick Sample Prompts */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Try sample:</span>
          <button
            type="button"
            onClick={() =>
              setSample("The model improves translation quality over prior ensemble models.")
            }
            className="rounded-lg border bg-muted/60 px-2.5 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Translation quality gains
          </button>
          <button
            type="button"
            onClick={() => setSample("The method was tested on 100 different natural languages.")}
            className="rounded-lg border bg-muted/60 px-2.5 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            100 languages tested
          </button>
        </div>
      </div>

      {/* Error state */}
      {verify.isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            <p className="font-semibold text-sm">Verification Failed</p>
          </div>
          <p className="mt-1 text-xs">{verify.error.message}</p>
        </div>
      )}

      {/* Verification Result */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {(() => {
            const config = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.abstain;
            const VerdictIcon = config.icon;

            return (
              <div
                className={`rounded-3xl border p-6 shadow-soft sm:p-8 ${config.bg} ${config.border}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge
                    variant="outline"
                    className={`gap-1.5 px-3 py-1 text-xs font-semibold ${config.text}`}
                  >
                    <VerdictIcon className="size-4" aria-hidden />
                    {config.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Checked Claim: &ldquo;{result.claim}&rdquo;
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold tracking-wide text-foreground">
                    Assessment Explanation
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                    {result.explanation}
                  </p>
                </div>

                {/* Evidence Passages */}
                {result.evidence && result.evidence.length > 0 && (
                  <div className="mt-5 border-t border-border/40 pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Retrieved Supporting & Context Passages
                    </h4>
                    <div className="mt-3 space-y-3">
                      {result.evidence.map((ev, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border bg-card/70 p-3.5 text-xs text-card-foreground shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              Page {ev.page} ({ev.kind} evidence)
                            </span>
                            <button
                              type="button"
                              onClick={() => openCitation({ page: ev.page, snippet: ev.snippet })}
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                              <span>View in citation panel</span>
                              <ExternalLink className="size-3" aria-hidden />
                            </button>
                          </div>
                          <p className="mt-2 italic text-muted-foreground">
                            &ldquo;{ev.snippet}&rdquo;
                          </p>
                          {ev.relation && (
                            <p className="mt-1.5 text-foreground/80">
                              <span className="font-medium">Relation: </span>
                              {ev.relation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disclaimer banner */}
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-background/50 p-3 text-xs text-muted-foreground">
                  <ShieldAlert
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <p>{result.disclaimer}</p>
                </div>
              </div>
            );
          })()}
        </motion.div>
      )}
    </div>
  );
}
