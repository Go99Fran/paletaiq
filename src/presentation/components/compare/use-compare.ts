"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_COMPARE } from "@/config";

const STORAGE_KEY = "paletaiq.compare";
const CHANGE_EVENT = "paletaiq:compare-change";

function readSelection(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function writeSelection(slugs: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Selección de paletas a comparar, persistida en localStorage y sincronizada entre componentes. */
export function useCompare() {
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSlugs(readSelection());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((slug: string) => {
    const current = readSelection();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug].slice(0, MAX_COMPARE);
    writeSelection(next);
  }, []);

  const clear = useCallback(() => writeSelection([]), []);

  return { slugs, toggle, clear };
}
