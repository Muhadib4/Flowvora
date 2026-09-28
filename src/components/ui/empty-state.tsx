import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center", compact && "p-5", className)}>
      {Icon ? <span className="mb-3 grid size-10 place-items-center rounded-lg border border-border bg-surface-raised text-muted"><Icon className="size-5" /></span> : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-5 text-secondary">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
