import { motion, useReducedMotion } from "framer-motion";

export function TypingIndicator() {
  const reduce = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex w-fit items-center gap-1.5 rounded-2xl border bg-card px-4 py-3.5 shadow-soft"
    >
      <span className="sr-only">Assistant is reading the paper…</span>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="size-1.5 rounded-full bg-muted-foreground"
          animate={reduce ? {} : { opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
