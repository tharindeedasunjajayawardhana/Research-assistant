import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRightLeft,
  CheckCircle2,
  FileCheck,
  HelpCircle,
  Layers,
  Loader2,
  Scale,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { comparePapers, listPapers } from "@/lib/api";
import type { CompareResult, Paper, PaperProfile, ResponseLanguage } from "@/lib/types";

interface Props {
  paperId: string;
  lang: ResponseLanguage;
}

export function CompareTab({ paperId, lang }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([paperId]);
  const [focusQuery, setFocusQuery] = useState("");

  const papersQuery = useQuery({
    queryKey: ["papers"],
    queryFn: listPapers,
  });

  const compareMutation = useMutation<CompareResult, Error, void>({
    mutationFn: () => comparePapers(selectedIds, focusQuery.trim() || undefined, lang),
  });

  const allPapers: Paper[] = (papersQuery.data || []).filter((p) => p.status === "ready");

  const togglePaper = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((p) => p !== id) : prev) : [...prev, id],
    );
  };

  const handleRunComparison = () => {
    if (selectedIds.length < 2) return;
    compareMutation.mutate();
  };

  const result = compareMutation.data;

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2">
          <Scale className="size-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">Multi-Paper Comparison</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Select two or more uploaded research papers to compare objectives, methodology, empirical
          findings, agreements, and disagreements without blending claims.
        </p>

        {/* Paper selector list */}
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Select Papers to Compare (At least 2 required):
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {allPapers.map((p) => {
              const selected = selectedIds.includes(p.id);
              const isCurrent = p.id === paperId;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePaper(p.id)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                    selected
                      ? "border-primary bg-primary/10 text-primary dark:bg-primary/20"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <FileCheck className="size-3.5" aria-hidden />
                  <span className="max-w-[180px] truncate">{p.filename}</span>
                  {isCurrent && (
                    <Badge variant="outline" className="text-[10px] py-0">
                      Current
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Focus query & submit */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            value={focusQuery}
            onChange={(e) => setFocusQuery(e.target.value)}
            placeholder="Focus topic / question (optional, e.g. training compute and BLEU scores)"
            className="h-11 rounded-xl text-sm"
            disabled={compareMutation.isPending}
          />
          <Button
            onClick={handleRunComparison}
            disabled={selectedIds.length < 2 || compareMutation.isPending}
            className="h-11 rounded-xl px-6"
          >
            {compareMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Comparing…
              </>
            ) : (
              <>
                <ArrowRightLeft className="size-4" aria-hidden />
                Compare {selectedIds.length} Papers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {compareMutation.isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            <p className="font-semibold text-sm">Comparison Failed</p>
          </div>
          <p className="mt-1 text-xs">{compareMutation.error.message}</p>
        </div>
      )}

      {/* Comparison Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Executive Comparative Summary */}
          <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
            <h3 className="text-base font-semibold">Comparative Synthesis</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{result.summary}</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {/* Agreements */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" aria-hidden />
                  <span>Consensus Agreements</span>
                </div>
                <ul className="mt-2.5 space-y-1.5 list-disc pl-4 text-foreground/80">
                  {result.synthesis.agreements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Disagreements */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-rose-800 dark:text-rose-300">
                  <XCircle className="size-4" aria-hidden />
                  <span>Conflicting Findings / Nuances</span>
                </div>
                <ul className="mt-2.5 space-y-1.5 list-disc pl-4 text-foreground/80">
                  {result.synthesis.disagreements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Evidence Gaps */}
              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300">
                  <HelpCircle className="size-4" aria-hidden />
                  <span>Shared Evidence Gaps</span>
                </div>
                <ul className="mt-2.5 space-y-1.5 list-disc pl-4 text-foreground/80">
                  {result.synthesis.evidence_gaps.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Individual Paper Profiles */}
          <div className="grid gap-4 md:grid-cols-2">
            {result.profiles.map((prof: PaperProfile) => (
              <div
                key={prof.paper_id}
                className="rounded-2xl border bg-card p-5 shadow-soft space-y-3"
              >
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-primary" aria-hidden />
                  <h4 className="font-semibold text-sm truncate">{prof.title}</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-semibold text-muted-foreground">Objectives: </span>
                    <span className="text-foreground/90">{prof.objectives}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Methodology: </span>
                    <span className="text-foreground/90">{prof.methodology}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Datasets: </span>
                    <span className="text-foreground/90">{prof.datasets}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Main Findings: </span>
                    <span className="text-foreground/90">{prof.findings}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Limitations: </span>
                    <span className="text-foreground/90">{prof.limitations}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
