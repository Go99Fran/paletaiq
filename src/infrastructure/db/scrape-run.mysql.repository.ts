import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "./mysql-client";

export interface ScrapeRun {
  id: number;
  source: string;
  status: "running" | "success" | "error";
  triggerType: string;
  triggeredBy: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  itemsFound: number;
  itemsCreated: number;
  itemsUpdated: number;
  errorMessage: string | null;
}

interface ScrapeRunRow extends RowDataPacket {
  id: number;
  source: string;
  status: "running" | "success" | "error";
  trigger_type: string;
  triggered_by: string | null;
  started_at: Date;
  finished_at: Date | null;
  items_found: number;
  items_created: number;
  items_updated: number;
  error_message: string | null;
}

/**
 * True si la fuente ya tiene una corrida en estado 'running'. Sirve de guard
 * contra disparos concurrentes (doble click en el admin, cron pisando a manual).
 * Solo cuenta corridas recientes: una 'running' de hace horas es una colgada
 * que no debe bloquear para siempre.
 */
export async function hasActiveScrapeRun(source: string): Promise<boolean> {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT id FROM scrape_runs
     WHERE source = :source AND status = 'running'
       AND started_at > (NOW() - INTERVAL 30 MINUTE)
     LIMIT 1`,
    { source },
  );
  return rows.length > 0;
}

export async function listRecentScrapeRuns(limit = 50): Promise<ScrapeRun[]> {
  const [rows] = await getPool().query<ScrapeRunRow[]>(
    `SELECT id, source, status, trigger_type, triggered_by, started_at, finished_at,
            items_found, items_created, items_updated, error_message
     FROM scrape_runs ORDER BY started_at DESC LIMIT ${Number(limit)}`,
  );
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    status: r.status,
    triggerType: r.trigger_type,
    triggeredBy: r.triggered_by,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    itemsFound: r.items_found,
    itemsCreated: r.items_created,
    itemsUpdated: r.items_updated,
    errorMessage: r.error_message,
  }));
}
