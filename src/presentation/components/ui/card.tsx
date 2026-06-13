import type { HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Aplica el estilo translúcido glass (default true). */
  glass?: boolean;
  /** Eleva en hover con glow (para grillas de cards). */
  interactive?: boolean;
}

export function Card({ className, glass = true, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl",
        glass ? "glass" : "border border-border bg-surface shadow-sm",
        interactive && "glass-hover glow-ring",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-b border-glass-border px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}
