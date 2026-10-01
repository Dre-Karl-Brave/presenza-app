import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { importBatches } from "@/db/schema";
import { publicProcedure, router } from "@/server/trpc";
import { clearAllData, ImportFileError, undoImport } from "@/server/services/import";

function toTrpcError(error: unknown): unknown {
  if (error instanceof ImportFileError) {
    return new TRPCError({ code: error.status === 404 ? "NOT_FOUND" : "BAD_REQUEST", message: error.message });
  }
  return error;
}

export const importRouter = router({
  history: publicProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(importBatches)
      .where(eq(importBatches.deleted, false))
      .orderBy(desc(importBatches.createdAt), desc(importBatches.id));
    return rows.map((row) => ({
      id: row.id,
      fileName: row.fileName,
      fileKind: row.fileKind,
      createdAt: row.createdAt.toISOString(),
      rowsRead: row.rowsRead,
      rowsImported: row.rowsImported,
      rowsInvalid: row.rowsInvalid,
      logsCreated: row.logsCreated,
      logsUpdated: row.logsUpdated,
      logsUnchanged: row.logsUnchanged,
    }));
  }),

  undo: publicProcedure
    .input(z.object({ batchId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await undoImport(ctx.db, input.batchId);
      } catch (error) {
        throw toTrpcError(error);
      }
    }),

  // Soft-deletes every row in every table. The literal makes a stray call fail.
  clearAll: publicProcedure
    .input(z.object({ confirm: z.literal("CLEAR") }))
    .mutation(({ ctx }) => clearAllData(ctx.db)),
});
