import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CitationText } from "@/components/citation/CitationText";
import { SourceList } from "@/components/citation/SourceList";
import type { ChatMessage } from "@/lib/types";

export const ChatMessageItem = memo(function ChatMessageItem({
  message,
}: {
  message: ChatMessage;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user")
    return (
      <motion.li
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground sm:max-w-[70%]">
          <span className="sr-only">You: </span>
          {message.content}
        </div>
      </motion.li>
    );

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <article
        className="rounded-2xl rounded-tl-md border bg-card p-5 shadow-soft sm:p-6"
        aria-label="Assistant answer"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            Research Assistant
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-600" aria-hidden />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" aria-hidden />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
        <div className="text-[15px] leading-7">
          <CitationText text={message.content} sources={message.sources} />
        </div>
        <SourceList
          pages={message.sources.map((s) => s.page)}
          sources={message.sources}
          emptyText="No supporting passage found in the paper."
        />
      </article>
    </motion.li>
  );
});
