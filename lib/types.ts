import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/routers/root";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type Summary = RouterOutputs["analytics"]["summary"];
export type FilterOptions = RouterOutputs["analytics"]["filterOptions"];
export type StudentReport = RouterOutputs["analytics"]["studentReport"];
export type StudentRow = StudentReport["rows"][number];
export type Granularity = "day" | "week" | "month";
