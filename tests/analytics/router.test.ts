import { beforeAll, describe, expect, it } from "vitest";
import { createCaller } from "@/server/routers/root";
import { createFixtureDb } from "./fixture";

type Caller = ReturnType<typeof createCaller>;
let caller: Caller;

beforeAll(async () => {
  const { db } = await createFixtureDb();
  caller = createCaller({ db });
});

describe("analytics router", () => {
  it("accepts no input at all", async () => {
    const summary = await caller.analytics.summary();
    expect(summary.stats.total).toBe(11);
    expect((await caller.analytics.studentReport()).total).toBe(4);
    expect((await caller.analytics.lowAttendance()).rows).toHaveLength(3);
  });

  it("applies filters from the input", async () => {
    const trend = await caller.analytics.trend({ filter: { month: "2026-09" }, granularity: "day" });
    expect(trend.map((p) => p.bucket)).toEqual(["2026-09-07", "2026-09-08"]);
  });

  it("rejects invalid input", async () => {
    await expect(caller.analytics.summary({ filter: { dayOfWeek: 9 } })).rejects.toThrow();
    await expect(caller.analytics.summary({ filter: { month: "2026-13" } })).rejects.toThrow();
    await expect(
      caller.analytics.studentReport({
        filter: {},
        sortBy: "name",
        sortDir: "asc",
        page: 1,
        pageSize: 1000,
      }),
    ).rejects.toThrow();
  });
});
