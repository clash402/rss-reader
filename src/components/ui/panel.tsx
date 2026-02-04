import * as React from "react";
import { cn } from "@/lib/utils";

export type PanelProps = React.HTMLAttributes<HTMLDivElement>;

export const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-[rgb(var(--border))]/80 bg-[rgb(var(--surface))] shadow-[0_15px_45px_-35px_rgba(15,23,42,0.8)]",
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = "Panel";
