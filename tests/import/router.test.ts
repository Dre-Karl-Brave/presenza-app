import { beforeEach, describe, expect, it } from "vitest";
import { createCaller } from "@/server/routers/root";
import { getSummary } from "@/server/services/analytics";
import { parseFile } from "@/server/services/import/parse";
import { TEMPLATE_COLUMNS } from "@/server/services/import/columns";
import { templateCsv, templateXlsx } from "@/server/services/import/template";
import { validateTable } from "@/server/services/import/validate";
import { createEmptyDb } from "../analytics/fixture";
import { commitFile } from "./helpers";

type Caller = ReturnType<typeof createCaller>;
let caller: Caller;
let db: Awaited<ReturnType<typeof createEmptyDb>>;

beforeEach(async () => {
  db = await createEmptyDb();
  caller = createCaller({ db });
});

describe("import router", () => {
  it("lists the import history, newest first", async () => {
    expect(await caller.import.history()).toEqual([]);
    const first = await commitFile(db, "attendance.csv");
    const second = await commitFile(db, "no-times.csv");
    const history = await caller.import.history();
    expect(history.map((h) => h.id)).toEqual([second.batchId, first.batchId]);
    expect(history[1]).toMatchObject({
      fileName: "attendance.csv",
      fileKind: "csv",
      rowsRead: 6,
      rowsImported: 6,
      rowsInvalid: 0,
      logsCreated: 6,
    });
    expect(typeof history[0].createdAt).toBe("string");
  });

  it("undoes one import and reports a missing one clearly", async () => {
    const first = await commitFile(db, "attendance.csv");
    const result = await caller.import.undo({ batchId: first.batchId });
    expect(result.logsRemoved).toBe(6);
    expect(await caller.import.history()).toEqual([]);
    await expect(caller.import.undo({ batchId: first.batchId })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("only clears all data when the confirmation word is exact", async () => {
    await commitFile(db, "attendance.csv");
    // @ts-expect-error the wrong confirmation must be rejected by validation as well as by the type
    await expect(caller.import.clearAll({ confirm: "clear" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // @ts-expect-error no confirmation at all
    await expect(caller.import.clearAll({})).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect((await getSummary(db, {})).stats.total).toBe(6);

    const result = await caller.import.clearAll({ confirm: "CLEAR" });
    expect(result.removed.attendance_logs).toBe(6);
    expect((await getSummary(db, {})).stats.total).toBe(0);
    expect(await caller.import.history()).toEqual([]);
  });
});

describe("template", () => {
  it("has the expected columns in the CSV and the XLSX", async () => {
    const expected = ["student number", "student name", "subject code", "section", "date", "time in", "time out", "status", "class start", "class end"];
    expect(TEMPLATE_COLUMNS.map((c) => c.header)).toEqual(expected);

    const csv = await parseFile("t.csv", new TextEncoder().encode(templateCsv()));
    expect(csv.headers).toEqual(expected);
    expect(validateTable(csv).rows).toEqual([]);

    const xlsx = await parseFile("t.xlsx", new Uint8Array(await templateXlsx()));
    expect(xlsx.headers).toEqual(expected);
    const result = validateTable(xlsx);
    expect(result.rowsRead).toBe(0);
    expect(result.errors).toEqual([]);
  });
});
