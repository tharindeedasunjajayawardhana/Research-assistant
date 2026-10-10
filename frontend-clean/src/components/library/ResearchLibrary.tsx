import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  FileWarning,
  Languages,
  Loader2,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletePaper, listPapers } from "@/lib/api";
import type { Paper } from "@/lib/types";

export function ResearchLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paperToDelete, setPaperToDelete] = useState<Paper | null>(null);

  const {
    data: papers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["papers"],
    queryFn: listPapers,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePaper(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["papers"] });
      setPaperToDelete(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
        Loading research library…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center text-destructive">
        <FileWarning className="mx-auto size-6" aria-hidden />
        <p className="mt-2 text-sm font-semibold">Could not load research library</p>
        <p className="mt-1 text-xs">
          {error instanceof Error ? error.message : "Error loading papers"}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 rounded-xl">
          <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Research Library">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Research Library ({papers.length})
          </h2>
          <p className="text-xs text-muted-foreground">
            Previously uploaded and indexed documents available for analysis and cross-paper
            comparison.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="rounded-xl h-8 px-3 text-xs"
        >
          <RefreshCw className="mr-1.5 size-3" aria-hidden />
          Refresh
        </Button>
      </div>

      {papers.length === 0 ? (
        <div className="rounded-2xl border bg-card/60 p-8 text-center text-muted-foreground">
          <BookOpen className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
          <p className="mt-2 text-sm font-medium">No papers in library yet</p>
          <p className="text-xs">Upload your first research paper above to begin.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {papers.map((paper) => (
            <motion.div
              key={paper.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="group flex flex-col justify-between rounded-2xl border bg-card p-4 shadow-soft transition hover:border-primary/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" aria-hidden />
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${
                        paper.status === "ready"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : paper.status === "processing"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {paper.status}
                    </Badge>
                  </div>
                </div>

                <h3 className="mt-2.5 font-semibold text-sm line-clamp-2 leading-snug">
                  {paper.title || paper.filename}
                </h3>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{paper.page_count} pages</span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Languages className="size-3" aria-hidden />
                    {paper.language_name || paper.language}
                  </span>
                  {paper.created_at && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" aria-hidden />
                        {new Date(paper.created_at).toLocaleDateString()}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPaperToDelete(paper)}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5 mr-1" aria-hidden />
                  Delete
                </Button>

                <Button asChild size="sm" className="h-8 rounded-xl text-xs gap-1">
                  <Link to="/paper/$id" params={{ id: paper.id }} search={{ lang: "auto" }}>
                    <span>Open Workspace</span>
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!paperToDelete} onOpenChange={(open) => !open && setPaperToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Research Paper?</AlertDialogTitle>
            <AlertDialogDescription>
              This will safely remove &ldquo;{paperToDelete?.filename}&rdquo;, its extracted chunks,
              notes, cached summaries, and stored PDF file. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => paperToDelete && deleteMutation.mutate(paperToDelete.id)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Paper"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
