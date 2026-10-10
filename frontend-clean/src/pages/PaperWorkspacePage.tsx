import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileWarning, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FooterNote } from "@/components/layout/FooterNote";
import { StatusMessage } from "@/components/layout/StatusMessage";
import { CitationProvider } from "@/components/citation/CitationContext";
import { CitationPanel } from "@/components/citation/CitationPanel";
import { LowTextWarning } from "@/components/workspace/LowTextWarning";
import { WorkspaceTabs } from "@/components/workspace/WorkspaceTabs";
import { WorkspaceTopBar } from "@/components/workspace/WorkspaceTopBar";
import { usePaper } from "@/hooks/usePaper";
import { useSummary } from "@/hooks/useSummary";
import type { ResponseLanguage } from "@/lib/types";

interface Props {
  paperId: string;
  lang: ResponseLanguage;
  onLangChange: (l: ResponseLanguage) => void;
}

export function PaperWorkspacePage({ paperId, lang, onLangChange }: Props) {
  const paper = usePaper(paperId);
  const summary = useSummary(paperId, lang);
  const [warningDismissed, setWarningDismissed] = useState(false);

  if (paper.isPending)
    return (
      <main className="grid min-h-screen place-items-center" aria-live="polite">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Analyzing document…
        </p>
      </main>
    );

  if (paper.isError || !paper.data)
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <StatusMessage
          tone="error"
          icon={FileWarning}
          title="We couldn't open this paper."
          description="It may have expired or the link is incorrect."
          action={
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => paper.refetch()}>
                <RotateCcw className="size-4" aria-hidden />
                Retry
              </Button>
              <Button asChild className="rounded-xl">
                <Link to="/">Upload a paper</Link>
              </Button>
            </div>
          }
        />
      </main>
    );

  const p = paper.data;
  return (
    <CitationProvider>
      <div className="flex min-h-screen flex-col">
        <WorkspaceTopBar
          paper={p}
          title={summary.data?.title}
          lang={lang}
          onLangChange={onLangChange}
        />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {!warningDismissed && (
            <LowTextWarning
              pages={p.low_text_pages}
              onDismiss={() => setWarningDismissed(true)}
              className="mb-6"
            />
          )}
          <WorkspaceTabs paperId={p.id} lang={lang} />
        </main>
        <FooterNote />
      </div>
      <CitationPanel filename={p.filename} />
    </CitationProvider>
  );
}
