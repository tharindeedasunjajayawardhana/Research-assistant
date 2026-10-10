import { motion } from "framer-motion";
import { BrandMark } from "@/components/layout/BrandMark";
import { FooterNote } from "@/components/layout/FooterNote";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UploadFlow } from "@/components/upload/UploadFlow";
import { ResearchLibrary } from "@/components/library/ResearchLibrary";

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-hero-glow"
        aria-hidden
      />
      <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <BrandMark />
        <ThemeToggle />
      </header>
      <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-10 sm:pt-16 space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <h1 className="text-sm font-medium tracking-wide text-primary">AI Research Assistant</h1>
          <p className="mt-4 text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
            Understand papers.
            <br />
            Ask questions.
            <br />
            <span className="text-muted-foreground">Cite the page.</span>
          </p>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Upload a paper to get a structured summary and answers grounded in its pages.
          </p>
        </motion.div>

        <div className="mx-auto max-w-xl">
          <UploadFlow />
        </div>

        <div className="border-t pt-8">
          <ResearchLibrary />
        </div>
      </main>
      <FooterNote />
    </div>
  );
}
