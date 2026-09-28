"use client";

import * as React from "react";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuGroup = DropdownPrimitive.Group;
export const DropdownMenuSub = DropdownPrimitive.Sub;
export const DropdownMenuRadioGroup = DropdownPrimitive.RadioGroup;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "surface-shadow z-[80] min-w-44 overflow-hidden rounded-lg border border-border bg-surface p-1 text-foreground data-[state=closed]:animate-[fadeOut_100ms_ease] data-[state=open]:animate-[fadeIn_120ms_ease]",
        className,
      )}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownPrimitive.Content.displayName;

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { inset?: boolean; danger?: boolean }
>(({ className, inset, danger, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex min-h-8 select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted",
      inset && "pl-8",
      danger && "text-danger data-[highlighted]:bg-danger-soft [&_svg]:text-danger",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownPrimitive.Item.displayName;

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
));
DropdownMenuSeparator.displayName = DropdownPrimitive.Separator.displayName;

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.Label ref={ref} className={cn("px-2 py-1.5 text-xs font-medium text-muted", className)} {...props} />
));
DropdownMenuLabel.displayName = DropdownPrimitive.Label.displayName;

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn("relative flex min-h-8 select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-surface-hover", className)}
    {...props}
  >
    <span className="absolute left-2 grid size-4 place-items-center">
      <DropdownPrimitive.ItemIndicator><Check className="size-3.5 text-accent" /></DropdownPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownPrimitive.CheckboxItem.displayName;

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
  <DropdownPrimitive.SubTrigger ref={ref} className={cn("flex min-h-8 select-none items-center rounded-md px-2 py-1.5 text-sm outline-none data-[state=open]:bg-surface-hover data-[highlighted]:bg-surface-hover", className)} {...props}>
    {children}<ChevronRight className="ml-auto size-4 text-muted" />
  </DropdownPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownPrimitive.SubTrigger.displayName;

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownPrimitive.SubContent ref={ref} className={cn("surface-shadow z-[90] min-w-40 rounded-lg border border-border bg-surface p-1", className)} {...props} />
));
DropdownMenuSubContent.displayName = DropdownPrimitive.SubContent.displayName;
