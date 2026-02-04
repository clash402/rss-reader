import * as React from "react";
import { cn } from "@/lib/utils";

export type TagChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export const TagChip = React.forwardRef<HTMLButtonElement, TagChipProps>(
  ({ className, active, children, ...props }, ref) => (
    <button
      ref={ref}
      data-active={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium text-[rgb(var(--muted-foreground))] transition hover:text-[rgb(var(--foreground))]",
        active
          ? "border-[rgb(var(--accent))]/60 bg-[rgb(var(--accent))]/10 text-[rgb(var(--foreground))]"
          : "border-transparent bg-[rgb(var(--muted))/0.4]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
TagChip.displayName = "TagChip";
