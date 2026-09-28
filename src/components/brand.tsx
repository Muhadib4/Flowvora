import { cn } from "@/lib/utils";

export function FlowvoraMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-contrast shadow-sm", className)} aria-hidden="true">
      <span className="absolute left-[8px] top-[8px] h-[4px] w-[12px] rounded-full bg-current opacity-95" />
      <span className="absolute left-[11px] top-[14px] h-[4px] w-[9px] rounded-full bg-current opacity-80" />
      <span className="absolute left-[14px] top-[20px] h-[4px] w-[6px] rounded-full bg-current opacity-60" />
    </span>
  );
}

export function FlowvoraLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <FlowvoraMark />
      {compact ? null : <span className="text-[17px] font-semibold tracking-[-0.025em] text-foreground">Flowvora</span>}
    </span>
  );
}
