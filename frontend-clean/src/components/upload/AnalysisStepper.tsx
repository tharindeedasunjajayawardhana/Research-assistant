import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Extracting text", "Detecting language", "Generating summary"];

export function AnalysisStepper({ current }: { current: number }) {
  return (
    <ol className="space-y-3" aria-live="polite" aria-label="Analysis progress">
      {STEPS.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "pending";
        return (
          <motion.li
            key={label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: state === "pending" ? 0.5 : 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.05 }}
            className="flex items-center gap-3 text-sm"
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border",
                state === "done" && "border-primary bg-primary text-primary-foreground",
                state === "active" && "border-primary text-primary",
              )}
            >
              {state === "done" ? (
                <Check className="size-3.5" aria-hidden />
              ) : state === "active" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : null}
            </span>
            <span className={state === "active" ? "font-medium" : undefined}>{label}</span>
            <span className="sr-only">
              {state === "done" ? "complete" : state === "active" ? "in progress" : "pending"}
            </span>
          </motion.li>
        );
      })}
    </ol>
  );
}
