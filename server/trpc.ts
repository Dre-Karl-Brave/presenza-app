import { initTRPC } from "@trpc/server";
import type { AnalyticsDb } from "@/server/services/analytics/types";

export type Context = {
  db: AnalyticsDb;
};

// Loaded lazily so importing the router never requires DATABASE_URL.
export async function createContext(): Promise<Context> {
  const { db } = await import("@/db");
  return { db };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
