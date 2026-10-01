import { boolean } from "drizzle-orm/pg-core";

// Soft delete flag shared by every table. Rows are never hard-deleted.
export const softDelete = {
  deleted: boolean("deleted").notNull().default(false),
};
