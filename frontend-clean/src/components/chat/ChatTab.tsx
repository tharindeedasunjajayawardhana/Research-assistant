import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, MessageSquareText, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";
import { ApiError, getSuggestions } from "@/lib/api";
import type { ResponseLanguage } from "@/lib/types";
import { ChatInput } from "./ChatInput";
import { ChatMessageItem } from "./ChatMessageItem";
import { TypingIndicator } from "./TypingIndicator";

const DEFAULT_SUGGESTIONS = [
  "What is the main research problem and motivation addressed in this paper?",
  "What method and experimental setup did the authors use?",
  "What limitations or weaknesses did the authors acknowledge?",
];

export function ChatTab({ paperId, lang }: { paperId: string; lang: ResponseLanguage }) {
  const { messages, ask, retry, isSending, isError, error } = useChat(paperId, lang);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = DEFAULT_SUGGESTIONS } = useQuery({
    queryKey: ["suggestions", paperId],
    queryFn: () => getSuggestions(paperId),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isSending]);

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
              <MessageSquareText className="size-5" aria-hidden />
            </span>
            <h2 className="mt-5 text-lg font-semibold tracking-tight">
              Ask anything about this paper
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Answers are grounded strictly in the uploaded paper, with page citations you can open
              and check.
            </p>
            <ul className="mt-7 grid w-full gap-2" aria-label="Suggested questions">
              {(suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS).map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => ask(s)}
                    disabled={isSending}
                    className="w-full rounded-xl border bg-card px-4 py-3 text-left text-sm shadow-soft transition-colors hover:border-primary/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-5 pb-6">
            <ol className="space-y-5" aria-label="Conversation" aria-live="polite">
              {messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} />
              ))}
            </ol>

            {/* Quick follow-up chips */}
            {suggestions.length > 0 && !isSending && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Sparkles className="size-3 text-primary" aria-hidden />
                  Suggested follow-ups:
                </span>
                {suggestions.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => ask(s)}
                    className="rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isSending && <TypingIndicator />}

        {isError && !isSending && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
          >
            <AlertCircle className="size-4 text-destructive" aria-hidden />
            <span className="flex-1">
              {error instanceof ApiError
                ? error.message
                : "We couldn't get an answer. Please try again."}
            </span>
            <Button size="sm" variant="outline" onClick={retry} className="rounded-lg">
              <RotateCcw className="size-3.5" aria-hidden />
              Retry
            </Button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-0 -mx-1 mt-4 bg-gradient-to-t from-background via-background to-transparent px-1 pb-4 pt-6">
        <ChatInput onSend={ask} disabled={isSending} />
      </div>
    </div>
  );
}
