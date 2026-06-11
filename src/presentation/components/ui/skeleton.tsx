import type { HTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "./cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-border/60", className)}
      {...props}
    />
  );
}

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
}

export function Spinner({ size = 20, className, ...props }: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex text-primary", className)} {...props}>
      <Loader2 size={size} aria-hidden className="animate-spin" />
    </span>
  );
}
