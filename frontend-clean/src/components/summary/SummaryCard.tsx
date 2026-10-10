import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { CitationText } from "@/components/citation/CitationText";
import { SourceList } from "@/components/citation/SourceList";
import type { SourcedText } from "@/lib/types";

interface Props {
  title: string;
  icon: LucideIcon;
  content: SourcedText;
  index: number;
}

export function SummaryCard({ title, icon: Icon, content, index }: Props) {
  const text = typeof content === "string" ? content : (content?.text ?? "");
  const sources = Array.isArray(content?.sources) ? content.sources : [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className="rounded-3xl border bg-card p-6 shadow-soft sm:p-7"
      aria-labelledby={`summary-${index}`}
    >
      <h3
        id={`summary-${index}`}
        className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"
      >
        <Icon className="size-4 text-primary" aria-hidden />
        {title}
      </h3>
      <div className="mt-3 text-[15px] leading-7 text-card-foreground/90">
        <CitationText text={text} />
      </div>
      <SourceList pages={sources} label="number" emptyText="No source pages listed." />
    </motion.article>
  );
}
