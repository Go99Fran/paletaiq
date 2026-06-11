"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "./cn";

export interface RangeSliderProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: number;
  onChange: (value: number) => void;
}

export function RangeSlider({ className, value, onChange, ...props }: RangeSliderProps) {
  return (
    <input
      type="range"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-primary", className)}
      {...props}
    />
  );
}
