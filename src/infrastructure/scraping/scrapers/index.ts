import type { SourceSpec } from "../scrape-runner";
import {
  dropshotSource,
  noxSource,
  siuxSource,
  starvieSource,
  vairoSource,
} from "./shopify-sources";

/** Registro de fuentes disponibles, indexadas por su identificador. */
export const SOURCES: Record<string, SourceSpec> = {
  siux: siuxSource,
  nox: noxSource,
  vairo: vairoSource,
  starvie: starvieSource,
  dropshot: dropshotSource,
};

export const SOURCE_NAMES = Object.keys(SOURCES);
