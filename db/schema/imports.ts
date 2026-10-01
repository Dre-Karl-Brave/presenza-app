import { pgTable, serial, integer, varchar, timestamp, jsonb } from "drizzle-orm/pg-core";
import { softDelete } from "./columns";

// Ids of everything one import created, so that import can be undone.
export type CreatedIds = {
  students: number[];
  subjects: number[];
  sections: number[];
  classes: number[];
  schedules: number[];
  sessions: number[];
  sectionLinks: { sectionId: number; studentId: number }[];
};

export const emptyCreatedIds = (): CreatedIds => ({
  students: [],
  subjects: [],
  sections: [],
  classes: [],
  schedules: [],
  sessions: [],
  sectionLinks: [],
});

// One row per committed file import (the import history).
export const importBatches = pgTable("import_batches", {
  id: serial("import_batch_id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileKind: varchar("file_kind", { length: 10 }).notNull(), // csv | xlsx | generated
  rowsRead: integer("rows_read").notNull().default(0),
  rowsImported: integer("rows_imported").notNull().default(0),
  rowsInvalid: integer("rows_invalid").notNull().default(0),
  logsCreated: integer("logs_created").notNull().default(0),
  logsUpdated: integer("logs_updated").notNull().default(0),
  logsUnchanged: integer("logs_unchanged").notNull().default(0),
  createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
  createdIds: jsonb("created_ids").$type<CreatedIds>().notNull(),
  ...softDelete,
});
