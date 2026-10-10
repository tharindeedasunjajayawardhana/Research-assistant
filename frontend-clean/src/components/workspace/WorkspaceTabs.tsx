import { useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark,
  Bot,
  FileText,
  Globe,
  GraduationCap,
  MessageSquareText,
  Scale,
  Search,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTab } from "@/components/summary/SummaryTab";
import { ChatTab } from "@/components/chat/ChatTab";
import { ConcernsTab } from "@/components/concerns/ConcernsTab";
import { VerifyTab } from "@/components/verify/VerifyTab";
import { CompareTab } from "@/components/compare/CompareTab";
import { AgentTab } from "@/components/agent/AgentTab";
import { NotesTab } from "@/components/notes/NotesTab";
import { QuizTab } from "@/components/quiz/QuizTab";
import { ScholarlyTab } from "@/components/scholarly/ScholarlyTab";
import type { ResponseLanguage } from "@/lib/types";

interface TabProps {
  paperId: string;
  lang: ResponseLanguage;
}

const TABS: {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  Component: ComponentType<TabProps>;
}[] = [
  { value: "summary", label: "Summary", icon: FileText, Component: SummaryTab },
  { value: "chat", label: "Ask the Paper", icon: MessageSquareText, Component: ChatTab },
  {
    value: "concerns",
    label: "Research Concerns",
    icon: ShieldAlert,
    badge: "Alerts",
    Component: ConcernsTab,
  },
  { value: "verify", label: "Claim Verification", icon: Search, Component: VerifyTab },
  { value: "compare", label: "Compare Papers", icon: Scale, Component: CompareTab },
  { value: "agent", label: "Research Agent", icon: Bot, Component: AgentTab },
  { value: "notes", label: "Notes & Evidence", icon: Bookmark, Component: NotesTab },
  { value: "quiz", label: "Study Quiz", icon: GraduationCap, Component: QuizTab },
  { value: "scholarly", label: "External Literature", icon: Globe, Component: ScholarlyTab },
];

export function WorkspaceTabs(props: TabProps) {
  const [tab, setTab] = useState("summary");
  const Active = TABS.find((t) => t.value === tab)?.Component ?? SummaryTab;

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <TabsList className="inline-flex h-11 w-max rounded-xl bg-muted p-1">
          {TABS.map(({ value, label, icon: Icon, badge }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-9 gap-1.5 rounded-lg px-3.5 text-xs font-medium whitespace-nowrap"
            >
              <Icon className="size-3.5" aria-hidden />
              <span>{label}</span>
              {badge && (
                <span className="ml-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                  {badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div role="tabpanel" aria-label={tab} className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <Active {...props} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Tabs>
  );
}
