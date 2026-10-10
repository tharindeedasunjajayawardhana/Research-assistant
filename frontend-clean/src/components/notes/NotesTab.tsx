import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AlertCircle, Bookmark, ExternalLink, Plus, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCitation } from "@/components/citation/CitationContext";
import { createNote, deleteNote, listNotes } from "@/lib/api";
import type { PaperNote } from "@/lib/types";

interface Props {
  paperId: string;
}

export function NotesTab({ paperId }: Props) {
  const queryClient = useQueryClient();
  const { openCitation } = useCitation();
  const [body, setBody] = useState("");
  const [pageNo, setPageNo] = useState<string>("");
  const [excerpt, setExcerpt] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const queryKey = ["notes", paperId];
  const notesQuery = useQuery({
    queryKey,
    queryFn: () => listNotes(paperId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      createNote(paperId, {
        body: body.trim(),
        page_no: pageNo ? parseInt(pageNo, 10) : null,
        excerpt: excerpt.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setBody("");
      setPageNo("");
      setExcerpt("");
      setIsAdding(false);
    },
  });

  const delMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(paperId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const notes: PaperNote[] = notesQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <div>
          <div className="flex items-center gap-2">
            <StickyNote className="size-5 text-primary" aria-hidden />
            <h2 className="text-xl font-semibold tracking-tight">
              Research Notes & Saved Evidence
            </h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Save personal notes, highlighted evidence passages, and critical observations linked to
            this paper.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} className="rounded-xl gap-1.5" size="sm">
          <Plus className="size-4" aria-hidden />
          {isAdding ? "Cancel" : "Add Note"}
        </Button>
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border bg-card p-6 shadow-soft space-y-4"
        >
          <h3 className="font-semibold text-sm">New Note or Evidence Snippet</h3>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your research note, thought, or critique here…"
            className="min-h-24 rounded-xl text-sm"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              type="number"
              min="1"
              value={pageNo}
              onChange={(e) => setPageNo(e.target.value)}
              placeholder="Source Page (optional, e.g. 3)"
              className="rounded-xl text-sm"
            />
            <Input
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Associated passage / quote (optional)"
              className="rounded-xl text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdding(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => addMutation.mutate()}
              disabled={!body.trim() || addMutation.isPending}
              className="rounded-xl"
            >
              {addMutation.isPending ? "Saving…" : "Save Note"}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="rounded-3xl border bg-card p-10 text-center shadow-soft">
          <Bookmark className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h3 className="mt-3 font-semibold">No notes saved yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Save thoughts, bookmark key findings, or record notes as you review this research paper.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notes.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-soft transition hover:border-primary/30"
            >
              <div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {n.body}
                </p>

                {n.excerpt && (
                  <div className="mt-3 rounded-xl border-l-2 border-primary/40 bg-muted/30 p-2.5 text-xs text-muted-foreground">
                    <p className="italic">&ldquo;{n.excerpt}&rdquo;</p>
                    {n.page_no && (
                      <button
                        type="button"
                        onClick={() =>
                          openCitation({ page: n.page_no as number, snippet: n.excerpt })
                        }
                        className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <span>Page {n.page_no}</span>
                        <ExternalLink className="size-3" aria-hidden />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span>{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => delMutation.mutate(n.id)}
                  disabled={delMutation.isPending}
                  className="h-7 px-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span className="sr-only">Delete Note</span>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
