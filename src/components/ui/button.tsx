import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-45 active:translate-y-px [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        primary: "border-accent bg-accent text-accent-contrast shadow-sm hover:border-accent-hover hover:bg-accent-hover",
        secondary: "border-border bg-surface text-foreground shadow-sm hover:border-border-strong hover:bg-surface-hover",
        ghost: "border-transparent bg-transparent text-secondary hover:bg-surface-hover hover:text-foreground",
        subtle: "border-transparent bg-accent-soft text-accent hover:border-accent/25",
        danger: "border-danger/25 bg-danger-soft text-danger hover:border-danger/40",
        outline: "border-border-strong bg-transparent text-foreground hover:bg-surface-hover",
      },
      size: {
        sm: "h-8 px-2.5 text-xs",
        md: "h-9 px-3.5",
        lg: "h-11 px-4 text-[15px]",
        icon: "size-9 p-0",
        "icon-sm": "size-8 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, children, disabled, ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
        {children}
      </Component>
    );
  },
);
Button.displayName = "Button";
