import { motion } from "framer-motion";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponseLanguageSelect } from "@/components/layout/ResponseLanguageSelect";
import { LowTextWarning } from "@/components/workspace/LowTextWarning";
import { languageFlag } from "@/lib/languages";
import type { Paper, ResponseLanguage } from "@/lib/types";
import { AnalysisStepper } from "./AnalysisStepper";

interface Props {
  paper: Paper;
  lang: ResponseLanguage;
  onLangChange: (l: ResponseLanguage) => void;
  onAnalyze: () => void;
  analysisStep: number | null;
}

export function PaperDetectedCard({ paper, lang, onLangChange, onAnalyze, analysisStep }: Props) {
  const analyzing = analysisStep !== null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28 }}
      aria-labelledby="detected-title"
      className="rounded-3xl border bg-card p-6 shadow-lifted sm:p-8"
    >
      <div className="flex items-center gap-2 text-sm text-success">
        <CheckCircle2 className="size-4" aria-hidden />
        Uploaded
      </div>
      <h2 id="detected-title" className="mt-2 text-xl font-semibold tracking-tight">
        Paper detected
      </h2>
      <p className="mt-1 truncate text-sm text-muted-foreground">{paper.filename}</p>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-background p-4">
          <dt className="text-xs text-muted-foreground">Language</dt>
          <dd className="mt-1 font-semibold">
            <span aria-hidden>{languageFlag(paper.language)} </span>
            {paper.language_name}
          </dd>
        </div>
        <div className="rounded-2xl border bg-background p-4">
          <dt className="text-xs text-muted-foreground">Pages</dt>
          <dd className="mt-1 font-semibold tabular-nums">{paper.page_count}</dd>
        </div>
      </dl>

      <LowTextWarning pages={paper.low_text_pages} className="mt-4" />

      <div className="mt-6">
        <ResponseLanguageSelect value={lang} onChange={onLangChange} />
        <p className="mt-2 text-xs text-muted-foreground">
          Auto answers in the language used in your question.
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary">
          <CheckCircle2 className="size-3.5" aria-hidden />
          Multilingual retrieval enabled
        </p>
      </div>

      <div className="mt-7 border-t pt-6">
        {analyzing ? (
          <AnalysisStepper current={analysisStep} />
        ) : (
          <Button onClick={onAnalyze} className="h-11 w-full rounded-xl">
            <Sparkles className="size-4" aria-hidden />
            Analyze paper
          </Button>
        )}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your original paper stays untouched.
      </p>
    </motion.section>
  );
}
