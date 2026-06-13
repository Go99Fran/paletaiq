"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { paddleRepository } from "@/application/factory";
import {
  PADDLE_BALANCES,
  PADDLE_HARDNESSES,
  PADDLE_LEVELS,
  PADDLE_SHAPES,
  PLAY_STYLES,
  type PaddleSurface,
} from "@/domain/paddle/paddle.entity";
import type { PaddleUpdateInput } from "@/domain/paddle/paddle.repository";
import { SOURCES } from "@/infrastructure/scraping/scrapers";
import { runScrape } from "@/infrastructure/scraping/scrape-runner";

async function requireAdmin(): Promise<string> {
  const session = await auth();
  if (session?.user?.role !== "admin" || !session.user.email) {
    throw new Error("No autorizado");
  }
  return session.user.email;
}

function enumOrNull<T extends string>(value: FormDataEntryValue | null, options: T[]): T | null {
  return options.includes(value as T) ? (value as T) : null;
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function textOrNull(value: FormDataEntryValue | null, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function updatePaddle(id: number, formData: FormData): Promise<void> {
  const email = await requireAdmin();

  const name = textOrNull(formData.get("name"), 200);
  const input: PaddleUpdateInput = {
    ...(name ? { name } : {}),
    year: numberOrNull(formData.get("year")),
    shape: enumOrNull(formData.get("shape"), PADDLE_SHAPES),
    balance: enumOrNull(formData.get("balance"), PADDLE_BALANCES),
    weightMin: numberOrNull(formData.get("weightMin")),
    weightMax: numberOrNull(formData.get("weightMax")),
    coreMaterial: textOrNull(formData.get("coreMaterial"), 120),
    faceMaterial: textOrNull(formData.get("faceMaterial"), 120),
    surface: enumOrNull<PaddleSurface>(formData.get("surface"), ["rough", "smooth"]),
    hardness: enumOrNull(formData.get("hardness"), PADDLE_HARDNESSES),
    level: enumOrNull(formData.get("level"), PADDLE_LEVELS),
    playStyle: enumOrNull(formData.get("playStyle"), PLAY_STYLES),
    thickness: numberOrNull(formData.get("thickness")),
    description: textOrNull(formData.get("description"), 10_000),
    isActive: formData.get("isActive") === "on",
    validated: formData.get("validated") === "on",
  };

  await paddleRepository.update(id, input, email);
  revalidatePath("/", "layout");
}

export async function triggerScrape(source: string): Promise<void> {
  const email = await requireAdmin();
  const spec = SOURCES[source];
  if (!spec) throw new Error(`Fuente desconocida: ${source}`);

  // Fire-and-forget: la corrida sigue en background y su estado se ve en scrape_runs.
  // Para corridas largas/programadas usar el CLI (npm run scrape) desde un cron externo.
  void runScrape(spec, { trigger: "manual_admin", triggeredBy: email }).catch((e) =>
    console.error(`Scrape ${source} falló:`, e),
  );

  revalidatePath("/", "layout");
}
