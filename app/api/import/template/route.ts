import { TEMPLATE_BASENAME, templateCsv, templateXlsx } from "@/server/services/import/template";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const format = new URL(request.url).searchParams.get("format") ?? "csv";

  if (format === "xlsx") {
    return new Response(await templateXlsx(), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${TEMPLATE_BASENAME}.xlsx"`,
      },
    });
  }
  if (format === "csv") {
    return new Response(templateCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${TEMPLATE_BASENAME}.csv"`,
      },
    });
  }
  return Response.json({ error: "format must be 'csv' or 'xlsx'." }, { status: 400 });
}
