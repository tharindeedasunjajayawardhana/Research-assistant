import { useId } from "react";
import { Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RESPONSE_LANGUAGE_OPTIONS, isResponseLanguage } from "@/lib/languages";
import type { ResponseLanguage } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  value: ResponseLanguage;
  onChange: (lang: ResponseLanguage) => void;
  compact?: boolean | undefined;
  className?: string | undefined;
}

export function ResponseLanguageSelect({ value, onChange, compact, className }: Props) {
  const id = useId();
  return (
    <div className={cn(compact ? "flex items-center" : "space-y-2", className)}>
      <Label htmlFor={id} className={cn(compact ? "sr-only" : "text-sm font-medium")}>
        Response language
      </Label>
      <Select value={value} onValueChange={(v) => isResponseLanguage(v) && onChange(v)}>
        <SelectTrigger
          id={id}
          className={cn("gap-2 rounded-xl bg-card", compact ? "h-9 w-[132px]" : "h-11 w-full")}
        >
          <Languages className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="flex-1 text-left">
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {RESPONSE_LANGUAGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
