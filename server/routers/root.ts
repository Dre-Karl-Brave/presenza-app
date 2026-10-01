import { createCallerFactory, router } from "@/server/trpc";
import { analyticsRouter } from "./analytics";
import { importRouter } from "./import";

export const appRouter = router({
  analytics: analyticsRouter,
  import: importRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);
