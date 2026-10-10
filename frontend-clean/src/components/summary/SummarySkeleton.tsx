import { Skeleton } from "@/components/ui/skeleton";

export function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-4">
      <span className="sr-only">Generating summary…</span>
      <div className="rounded-3xl border bg-card p-7 shadow-soft">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-7 w-2/3" />
        <div className="mt-4 flex gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-6 w-28 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`rounded-3xl border bg-card p-7 shadow-soft ${i === 0 ? "md:col-span-2" : ""}`}
          >
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-2.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-11/12" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
            <div className="mt-6 flex gap-1.5">
              <Skeleton className="h-6 w-10 rounded-lg" />
              <Skeleton className="h-6 w-10 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
