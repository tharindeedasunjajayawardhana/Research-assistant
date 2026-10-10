import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getChatHistory, sendChat } from "@/lib/api";
import type { ChatMessage, ResponseLanguage } from "@/lib/types";

export const chatKey = (id: string) => ["chat", id] as const;

/** Conversation history lives in the Query cache, populated from the backend. */
export function useChat(paperId: string, lang: ResponseLanguage) {
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<ChatMessage[]>({
    queryKey: chatKey(paperId),
    queryFn: () => getChatHistory(paperId),
    staleTime: 60_000,
  });

  const append = useCallback(
    (msg: ChatMessage) =>
      queryClient.setQueryData<ChatMessage[]>(chatKey(paperId), (prev = []) => [...prev, msg]),
    [queryClient, paperId],
  );

  const mutation = useMutation({
    mutationFn: (question: string) => sendChat(paperId, question, lang),
    onSuccess: append,
  });

  const ask = useCallback(
    (question: string, opts?: { isRetry?: boolean }) => {
      const q = question.trim();
      if (!q || mutation.isPending) return;
      if (!opts?.isRetry) append({ id: `u-${Date.now()}`, role: "user", content: q, sources: [] });
      mutation.mutate(q);
    },
    [append, mutation],
  );

  const retry = useCallback(() => {
    if (mutation.variables) ask(mutation.variables, { isRetry: true });
  }, [ask, mutation.variables]);

  return {
    messages,
    isLoading,
    ask,
    retry,
    isSending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
}
