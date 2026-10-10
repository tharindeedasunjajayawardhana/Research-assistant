import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getScholarly } from "@/lib/api";
import type { ScholarlyHit, ScholarlySearch } from "@/lib/types";

interface Props {
  paperId: string;
}

export function ScholarlyTab({ paperId }: Props) {
  const [query, setQuery] = useState("");

  const searchMutation = useMutation<ScholarlySearch, Error, string>({
    mutationFn: (q: string) => getScholarly(paperId, q),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    searchMutation.mutate(query.trim());
  };

  const data = searchMutation.data;

  return (
    <div className="space-y-6">
      {/* Search Header Card */}
      <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-primary" aria-hidden />
          <h2 className="text-xl font-semibold tracking-tight">External Scholarly Literature</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Query open academic literature via OpenAlex to find related papers, prior benchmarks, or
          competing methodologies across the broader scientific literature.
        </p>

        <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search academic works (e.g. self-attention sequence models or transformer translation)"
            className="h-11 rounded-xl text-sm"
            disabled={searchMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!query.trim() || searchMutation.isPending}
            className="h-11 rounded-xl px-6"
          >
            {searchMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Searching…
              </>
            ) : (
              <>
                <Search className="size-4" aria-hidden />
                Search OpenAlex
              </>
            )}
          </Button>
        </form>

        <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] bg-muted/60">
            External Literature
          </Badge>
          <span>
            External results are queried live and clearly separated from your uploaded document.
          </span>
        </div>
      </div>

      {/* Warning / Error */}
      {searchMutation.isError && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-5 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4" aria-hidden />
            <p className="font-semibold text-sm">Scholarly Search Unavailable</p>
          </div>
          <p className="mt-1 text-xs">{searchMutation.error.message}</p>
        </div>
      )}

      {data?.warning && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-300">
          {data.warning}
        </div>
      )}

      {/* Results list */}
      {data && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Found {data.results.length} related academic publications for &ldquo;{data.query}
            &rdquo;:
          </p>

          {data.results.length === 0 ? (
            <div className="rounded-3xl border bg-card p-10 text-center shadow-soft">
              <BookOpen className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <h3 className="mt-3 font-semibold">No external publications found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Try broadening your search terms or keywords.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.results.map((hit: ScholarlyHit, idx: number) => (
                <motion.article
                  key={idx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl border bg-card p-5 shadow-soft transition hover:border-primary/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{hit.title}</h3>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      OpenAlex
                    </Badge>
                  </div>

                  {hit.authors && hit.authors.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="size-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{hit.authors.slice(0, 5).join(", ")}</span>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground border-t pt-3">
                    {hit.publication_date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3" aria-hidden />
                        {hit.publication_date}
                      </span>
                    )}
                    {hit.doi && (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        DOI: {hit.doi}
                      </span>
                    )}
                    {hit.source_url && (
                      <a
                        href={hit.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline ml-auto"
                      >
                        <span>Open Publication</span>
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    )}
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
