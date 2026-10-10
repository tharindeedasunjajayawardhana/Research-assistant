import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "neutral" | "error";
}

/** Shared empty / error state. */
export function StatusMessage({ icon: Icon, title, description, action, tone = "neutral" }: Props) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className="mx-auto flex max-w-md flex-col items-center px-6 py-14 text-center"
    >
      <span
        className={
          tone === "error"
            ? "grid size-12 place-items-center rounded-2xl bg-destructive/10 text-destructive"
            : "grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"
        }
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="mt-5 text-base font-semibold tracking-tight">{title}</h2>
      {description && (
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
