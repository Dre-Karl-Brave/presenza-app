import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  processImportFile,
  type CommitResponse,
  type PreviewResponse,
} from "@/server/services/import";
import type { ImportDb } from "@/server/services/import/types";

export function fixtureBytes(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(__dirname, "fixtures", name)));
}

export async function previewFile(db: ImportDb, name: string): Promise<PreviewResponse> {
  const result = await processImportFile(db, { fileName: name, bytes: fixtureBytes(name), mode: "preview" });
  if ("batchId" in result) throw new Error("expected a preview response");
  return result;
}

export async function commitFile(db: ImportDb, name: string): Promise<CommitResponse> {
  const result = await processImportFile(db, { fileName: name, bytes: fixtureBytes(name), mode: "commit" });
  if (!("batchId" in result)) throw new Error("expected a commit response");
  return result;
}
