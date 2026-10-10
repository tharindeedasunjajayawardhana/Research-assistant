import { useCallback } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSummary } from "@/lib/api";
import type { ResponseLanguage } from "@/lib/types";

const summaryOptions = (id: string, lang: ResponseLanguage) =>
  queryOptions({
    queryKey: ["summary", id, lang],
    queryFn: () => getSummary(id, lang),
    staleTime: 10 * 60_000,
    retry: 1,
  });

export function useSummary(id: string, lang: ResponseLanguage) {
  return useQuery(summaryOptions(id, lang));
}

/** Warm the summary cache (used by the analysis step before entering the workspace). */
export function usePrefetchSummary() {
  const queryClient = useQueryClient();
  return useCallback(
    (id: string, lang: ResponseLanguage) => queryClient.prefetchQuery(summaryOptions(id, lang)),
    [queryClient],
  );
}
