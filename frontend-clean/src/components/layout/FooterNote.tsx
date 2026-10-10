import { ShieldCheck } from "lucide-react";

export function FooterNote() {
  return (
    <footer className="border-t px-4 py-5">
      <p className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
        Answers are generated from the uploaded paper only. Always verify against the original.
      </p>
    </footer>
  );
}
