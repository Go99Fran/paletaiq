import type { ButtonHTMLAttributes } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "glass" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-primary to-primary-hover text-primary-foreground shadow-sm shadow-primary/30 hover:shadow-md hover:shadow-primary/40 hover:brightness-110 focus-visible:outline-primary",
  secondary:
    "bg-secondary text-secondary-foreground hover:opacity-90 focus-visible:outline-secondary",
  ghost: "bg-transparent text-text hover:bg-glass-border/60 focus-visible:outline-muted",
  glass:
    "glass text-text hover:border-primary/40 hover:-translate-y-0.5 focus-visible:outline-primary",
  danger: "bg-danger text-primary-foreground hover:opacity-90 focus-visible:outline-danger",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-xl font-medium",
        "transition-all duration-200 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
