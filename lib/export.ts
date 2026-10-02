type CellValue = string | number | null | undefined;

function escapeCell(value: CellValue): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if the cell contains a comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadCSV(filename: string, headers: string[], rows: CellValue[][]) {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];

  const csv = lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
