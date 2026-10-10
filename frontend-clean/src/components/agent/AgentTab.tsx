import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  ShieldAlert,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCitation } from "@/components/citation/CitationContext";
import { startAgent } from "@/lib/api";
import type { AgentRun, AgentStep, ResponseLanguage } from "@/lib/types";

interface Props {
  paperId: string;
  lang: ResponseLanguage;
}

export function AgentTab({ paperId, lang }: Props) {
  const { openCitation } = useCitation();
  const [task, setTask] = useState("");
  const [approveExternal, setApproveExternal] = useState(false);

  const runAgent = useMutation<AgentRun, Error, void>({
    mutationFn: () => startAgent(paperId, task.trim(), lang, [paperId], approveExternal),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) return;
    runAgent.mutate();
  };

  const currentRun = runAgent.data;

  return (
    <div className="space-y-6">
      {/* Agent Launch Card */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">
            Bounded Autonomous Research Agent
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a structured research objective. The agent will formulate a plan, execute
          registered evidence-retrieval and verification tools within safety bounds, and generate a
          verified report.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <Input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="e.g. Synthesize the experimental benchmark gains and identify key unaddressed limitations."
            className="h-11 rounded-xl text-sm"
            disabled={runAgent.isPending}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={approveExternal}
                onChange={(e) => setApproveExternal(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>Allow external scholarly lookups (OpenAlex API) if needed</span>
            </label>

            <Button
              type="submit"
              disabled={!task.trim() || runAgent.isPending}
              className="h-10 rounded-xl px-5"
            >
              {runAgent.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Executing Agent Run…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  Launch Agent Run
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Safety Bounds Note */}
        <div className="mt-4 flex items-center gap-2 border-t pt-3 text-[11px] text-muted-foreground">
          <ShieldAlert className="size-3.5 text-muted-foreground shrink-0" aria-hidden />
          <span>
            Safety Bounds Active: Max 8 steps, token limits, sandboxed tool dispatch, zero external
            code execution.
          </span>
        </div>
      </div>

      {/* Error state */}
      {runAgent.isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            <p className="font-semibold text-sm">Agent Execution Failed</p>
          </div>
          <p className="mt-1 text-xs">{runAgent.error.message}</p>
        </div>
      )}

      {/* Agent Execution Timeline & Report */}
      {currentRun && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Timeline of Steps */}
          <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">Planned & Executed Steps</h3>
              <Badge
                variant="outline"
                className={
                  currentRun.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                }
              >
                Status: {currentRun.status}
              </Badge>
            </div>

            <div className="mt-5 space-y-3">
              {currentRun.steps.map((step: AgentStep) => (
                <div
                  key={step.step_index}
                  className="rounded-xl border bg-muted/30 p-3.5 text-xs transition hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="size-3.5 text-primary" aria-hidden />
                      <span className="font-semibold text-foreground">
                        Step {step.step_index + 1}: {step.tool}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {step.status}
                    </Badge>
                  </div>

                  {step.arguments && Object.keys(step.arguments).length > 0 && (
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Args: {JSON.stringify(step.arguments)}
                    </p>
                  )}

                  {step.error_message && (
                    <p className="mt-1 text-destructive">{step.error_message}</p>
                  )}

                  {step.citations && step.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {step.citations.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openCitation(c)}
                          className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 text-[10px] font-medium text-primary shadow-sm hover:underline"
                        >
                          <span>Page {c.page} source</span>
                          <ExternalLink className="size-2.5" aria-hidden />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final Structured Report */}
          {currentRun.report && (
            <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" aria-hidden />
                <h3 className="text-lg font-semibold tracking-tight">Agent Synthesis Report</h3>
              </div>

              <div className="mt-4 whitespace-pre-wrap rounded-2xl bg-muted/30 p-5 text-sm leading-relaxed">
                {currentRun.report.findings}
              </div>

              {/* Citations */}
              {currentRun.report.citations && currentRun.report.citations.length > 0 && (
                <div className="mt-5 border-t pt-4">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Consulted Source Citations
                  </h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {currentRun.report.citations.map((c, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        onClick={() => openCitation(c)}
                        className="h-8 gap-1 rounded-lg text-xs"
                      >
                        <span>Page {c.page}</span>
                        <ExternalLink className="size-3" aria-hidden />
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Unresolved Questions / Limitations */}
              {currentRun.report.unresolved_questions &&
                currentRun.report.unresolved_questions.length > 0 && (
                  <div className="mt-5 rounded-xl bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Unresolved Questions & Gaps:</span>
                    <ul className="mt-2 list-disc pl-4 space-y-1">
                      {currentRun.report.unresolved_questions.map((q, idx) => (
                        <li key={idx}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
