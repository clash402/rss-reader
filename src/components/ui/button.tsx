"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";

type Size = "default" | "sm" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: React.ReactNode;
};

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[rgb(var(--accent))] text-white shadow-sm shadow-[rgb(var(--shadow))] hover:bg-[rgb(var(--accent))]/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[rgb(var(--accent-soft))]",
  secondary:
    "bg-[rgb(var(--surface-elevated))] text-[rgb(var(--foreground))] border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/40",
  ghost:
    "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))/0.4]",
  outline:
    "border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:border-[rgb(var(--accent))]/40",
};

const sizeStyles: Record<Size, string> = {
  default: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-sm",
  lg: "h-14 px-6 text-base",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", icon, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {icon}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
