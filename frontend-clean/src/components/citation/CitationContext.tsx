import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface ActiveCitation {
  page: number;
  snippet?: string | undefined;
}

interface CitationContextValue {
  citation: ActiveCitation | null;
  isOpen: boolean;
  openCitation: (c: ActiveCitation) => void;
  closeCitation: () => void;
}

const Ctx = createContext<CitationContextValue | null>(null);

export function CitationProvider({ children }: { children: ReactNode }) {
  const [citation, setCitation] = useState<ActiveCitation | null>(null);
  const [isOpen, setOpen] = useState(false);
  const openCitation = useCallback((c: ActiveCitation) => {
    setCitation(c);
    setOpen(true);
  }, []);
  const closeCitation = useCallback(() => setOpen(false), []);
  const value = useMemo(
    () => ({ citation, isOpen, openCitation, closeCitation }),
    [citation, isOpen, openCitation, closeCitation],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCitation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCitation must be used within CitationProvider");
  return ctx;
}
