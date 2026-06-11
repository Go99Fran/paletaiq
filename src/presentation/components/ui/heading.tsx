import { createElement, type HTMLAttributes } from "react";
import { cn } from "./cn";

type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

const levelClasses: Record<HeadingLevel, string> = {
  1: "text-3xl font-bold tracking-tight sm:text-4xl",
  2: "text-2xl font-bold tracking-tight",
  3: "text-xl font-semibold",
  4: "text-lg font-semibold",
};

export function Heading({ level = 1, className, ...props }: HeadingProps) {
  return createElement(`h${level}`, {
    className: cn("text-text", levelClasses[level], className),
    ...props,
  });
}
