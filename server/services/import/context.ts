import { inArray, sql } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";
import type { CreatedIds } from "@/db/schema";
import type { ImportDb, ImportSummary } from "./types";

export type Tx = Parameters<Parameters<ImportDb["transaction"]>[0]>[0];

// Everything one import run shares: the open transaction, counters, and the
// ids of rows it created (kept so the import can be undone).
export type Ctx = {
  tx: Tx;
  summary: ImportSummary;
  created: CreatedIds;
};

export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

type ReviveTable = PgTable & { id: PgColumn };

// Soft-deleted rows are brought back instead of inserting duplicates
// (unique constraints still cover deleted rows).
export async function reviveByIds(ctx: Ctx, table: ReviveTable, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  for (const part of chunk(ids, 5000)) {
    await ctx.tx.execute(sql`update ${table} set "deleted" = false where ${inArray(table.id, part)}`);
  }
  ctx.summary.revived += ids.length;
}
