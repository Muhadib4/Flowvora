import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("panel", className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"header">) {
  return <header className={cn("flex items-start justify-between gap-3 p-4 pb-0 sm:p-5 sm:pb-0", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return <h2 className={cn("text-[15px] font-semibold tracking-[-0.01em] text-foreground", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("mt-1 text-sm leading-5 text-secondary", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}
