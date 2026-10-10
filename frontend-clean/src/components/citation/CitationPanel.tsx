import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCitation } from "./CitationContext";

/** Reusable source panel: right drawer on desktop, bottom sheet on mobile. */
export function CitationPanel({ filename }: { filename: string }) {
  const { citation, isOpen, closeCitation } = useCitation();
  const isMobile = useIsMobile();

  const motionProps = isMobile
    ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
    : { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(o) => !o && closeCitation()}>
      <AnimatePresence>
        {isOpen && citation && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                {...motionProps}
                transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
                className={
                  isMobile
                    ? "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t bg-card p-6 pb-8 shadow-lifted focus:outline-none"
                    : "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto border-l bg-card p-7 shadow-lifted focus:outline-none"
                }
              >
                {isMobile && (
                  <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" aria-hidden />
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Source
                    </p>
                    <Dialog.Title className="mt-1 text-xl font-semibold tracking-tight">
                      Source · Page {citation.page}
                    </Dialog.Title>
                  </div>
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      aria-label="Close source panel"
                    >
                      <X className="size-4" aria-hidden />
                    </Button>
                  </Dialog.Close>
                </div>

                <Dialog.Description asChild>
                  <figure className="mt-6 rounded-2xl border bg-background p-5">
                    {citation.snippet ? (
                      <blockquote className="border-l-2 border-primary pl-4 text-[15px] leading-relaxed">
                        {citation.snippet}
                      </blockquote>
                    ) : (
                      <p className="text-sm text-muted-foreground">Snippet not available</p>
                    )}
                    <figcaption className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{filename}</span>
                    </figcaption>
                  </figure>
                </Dialog.Description>

                <div className="mt-6 space-y-2">
                  <Button disabled className="w-full rounded-xl" aria-describedby="open-pdf-soon">
                    <ExternalLink className="size-4" aria-hidden />
                    Open PDF page
                  </Button>
                  <p id="open-pdf-soon" className="text-center text-xs text-muted-foreground">
                    Coming soon
                  </p>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
