import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (q: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !disabled;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!canSend) return;
    onSend(value);
    setValue("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-soft transition-shadow focus-within:ring-2 focus-within:ring-ring/40"
    >
      <label htmlFor="chat-input" className="sr-only">
        Ask a question about this paper
      </label>
      <textarea
        id="chat-input"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Ask a question about this paper…"
        aria-describedby="chat-hint"
        className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
      />
      <span id="chat-hint" className="sr-only">
        Press Enter to send, Shift+Enter for a new line.
      </span>
      <Button
        type="submit"
        size="icon"
        disabled={!canSend}
        aria-label="Send question"
        className="size-10 shrink-0 rounded-xl"
      >
        <ArrowUp className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
