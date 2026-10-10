import { motion } from "framer-motion";
import { CheckCircle2, FileText } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function UploadProgress({
  filename,
  progress,
  done,
}: {
  filename: string;
  progress: number;
  done: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-card p-7 shadow-soft" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{filename}</p>
          {done ? (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1.5 text-sm text-success"
            >
              <CheckCircle2 className="size-4" aria-hidden />
              Uploaded
            </motion.p>
          ) : (
            <p className="text-sm text-muted-foreground">Uploading…</p>
          )}
        </div>
        <span className="text-sm font-semibold tabular-nums">{progress}%</span>
      </div>
      <Progress value={progress} className="mt-5 h-1.5" aria-label="Upload progress" />
    </div>
  );
}
