import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPaper, uploadPaper } from "@/lib/api";
import type { Paper } from "@/lib/types";

export const paperKey = (id: string) => ["paper", id] as const;

/** Fetches a paper and keeps polling while the backend is still processing it. */
export function usePaper(id: string | undefined) {
  return useQuery({
    queryKey: paperKey(id ?? ""),
    queryFn: () => getPaper(id as string),
    enabled: !!id,
    staleTime: 5 * 60_000,
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 2000 : false),
  });
}

export function useUploadPaper() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: (file: File) => uploadPaper(file, setProgress),
    onMutate: () => setProgress(0),
    onSuccess: (paper: Paper) => {
      queryClient.setQueryData(paperKey(paper.id), paper);
      void queryClient.invalidateQueries({ queryKey: ["papers"] });
    },
  });
  const reset = useCallback(() => {
    mutation.reset();
    setProgress(0);
  }, [mutation]);
  return { ...mutation, progress, reset };
}
