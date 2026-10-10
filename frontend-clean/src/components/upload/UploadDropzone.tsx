import { useRef, useState, type DragEvent } from "react";
import { AlertCircle, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (file: File) => void;
  error?: string | null | undefined;
}

export function UploadDropzone({ onFile, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group cursor-pointer rounded-3xl border-2 border-dashed bg-card px-6 py-12 text-center shadow-soft transition-colors sm:py-16",
          dragging ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50",
          error && "border-destructive/50",
        )}
      >
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-transform duration-200 group-hover:-translate-y-0.5">
          <FileUp className="size-6" aria-hidden />
        </span>
        <p className="mt-5 text-lg font-semibold tracking-tight">Drop your research paper here</p>
        <p className="mt-1 text-sm text-muted-foreground">or</p>
        <Button
          type="button"
          className="mt-3 rounded-xl px-5"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          aria-describedby="upload-hint upload-error"
        >
          Choose PDF
        </Button>
        <p id="upload-hint" className="mt-4 text-xs text-muted-foreground">
          One paper at a time · PDF only · max 20 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <div id="upload-error" aria-live="assertive">
        {error && (
          <p className="mt-3 flex items-center justify-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
