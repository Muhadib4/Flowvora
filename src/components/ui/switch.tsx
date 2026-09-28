"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn("peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border-strong bg-surface-strong outline-none transition data-[state=checked]:border-accent data-[state=checked]:bg-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50", className)}
    {...props}
  >
    <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[17px]" />
  </SwitchPrimitive.Root>
));
Switch.displayName = SwitchPrimitive.Root.displayName;
