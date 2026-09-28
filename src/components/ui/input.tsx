import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground shadow-sm outline-none transition placeholder:text-muted hover:border-border-strong focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export function Field({
  label,
  description,
  error,
  className,
  children,
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("grid gap-1.5 text-sm", className)}>
      <span className="font-medium text-foreground">{label}</span>
      {description ? <span className="text-xs leading-5 text-muted">{description}</span> : null}
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </label>
  );
}
