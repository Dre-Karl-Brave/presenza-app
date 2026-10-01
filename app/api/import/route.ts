import { ImportFileError, MAX_FILE_BYTES } from "@/server/services/import/types";
import { processImportFile } from "@/server/services/import";

export const runtime = "nodejs";

function fail(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

// Stateless: the browser sends the same file once with mode=preview (nothing is
// saved) and again with mode=commit.
export async function POST(request: Request): Promise<Response> {
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode !== "preview" && mode !== "commit") return fail("mode must be 'preview' or 'commit'.", 400);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("Send the file as multipart/form-data.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return fail("No file was uploaded (the form field must be called 'file').", 400);
  if (file.size > MAX_FILE_BYTES) return fail("The file is larger than 10 MB.", 413);

  try {
    const { db } = await import("@/db");
    const result = await processImportFile(db, {
      fileName: file.name,
      bytes: new Uint8Array(await file.arrayBuffer()),
      mode,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof ImportFileError) return fail(error.message, error.status);
    process.stderr.write(`Import failed: ${error instanceof Error ? error.stack : String(error)}\n`);
    return fail("The import failed and nothing was saved.", 500);
  }
}
