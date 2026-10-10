import { ScanText, X } from "lucide-react";
import { formatPageRanges } from "@/lib/citations";
import { cn } from "@/lib/utils";

interface Props {
  pages: number[];
  onDismiss?: () => void | undefined;
  className?: string | undefined;
}

export function LowTextWarning({ pages, onDismiss, className }: Props) {
  if (!pages.length) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground",
        className,
      )}
    >
      <ScanText className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p className="flex-1 leading-relaxed">
        <span className="font-medium">
          {formatPageRanges(pages)} appear to be scanned or image-based.
        </span>{" "}
        Text extraction may be incomplete for these pages.
      </p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss warning"
          className="-m-1 rounded-lg p-1 hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
