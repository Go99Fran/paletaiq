import type { SourceSpec } from "../scrape-runner";
import { adidasSource } from "./adidas";
import { akkeronSource } from "./akkeron";
import { babolatSource } from "./babolat";
import { blackcrownSource } from "./blackcrown";
import { bullpadelSource } from "./bullpadel";
import { felinaSource } from "./felina";
import { kombatSource } from "./kombat";
import { royalSource } from "./royal";
import {
  dropshotSource,
  noxSource,
  siuxSource,
  starvieSource,
  vairoSource,
} from "./shopify-sources";

/** Registro de fuentes disponibles, indexadas por su identificador. */
export const SOURCES: Record<string, SourceSpec> = {
  adidas: adidasSource,
  akkeron: akkeronSource,
  babolat: babolatSource,
  blackcrown: blackcrownSource,
  bullpadel: bullpadelSource,
  felina: felinaSource,
  kombat: kombatSource,
  siux: siuxSource,
  nox: noxSource,
  royal: royalSource,
  vairo: vairoSource,
  starvie: starvieSource,
  dropshot: dropshotSource,
};

export const SOURCE_NAMES = Object.keys(SOURCES);
