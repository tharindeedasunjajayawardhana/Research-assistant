export function BrandMark({ showName = true }: { showName?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/favicon.ico"
        alt="AI Research Assistant logo"
        className="size-8 rounded-xl object-contain shadow-soft"
      />
      {showName && (
        <span className="text-sm font-semibold tracking-tight">AI Research Assistant</span>
      )}
    </span>
  );
}
