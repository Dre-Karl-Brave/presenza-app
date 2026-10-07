import type { DateFormat } from "./format";
import { formatDate } from "./format";

type CellValue = string | number | null | undefined;

function escapeCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(
  basename: string,
  headers: string[],
  rows: CellValue[][],
  dateFmt: DateFormat = "YYYY-MM-DD",
) {
  const today = formatDate(new Date(), "YYYY-MM-DD"); // filename always uses ISO
  const generatedLabel = `Generated on: ${formatDate(new Date(), dateFmt)}`;

  const lines = [
    [`# ${generatedLabel}`].map(escapeCell).join(","),
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  const csv = lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${basename}-${today}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
