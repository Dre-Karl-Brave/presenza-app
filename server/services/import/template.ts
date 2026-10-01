import ExcelJS from "exceljs";
import { COLUMNS, TEMPLATE_COLUMNS } from "./columns";

export const TEMPLATE_BASENAME = "presenza-attendance-template";

export function templateCsv(): string {
  return `${TEMPLATE_COLUMNS.map((column) => column.header).join(",")}\r\n`;
}

const DATE_COLUMN = 5;
const TIME_COLUMNS = [6, 7, 9, 10];
const STATUS_COLUMN_LETTER = "H";
const VALIDATED_ROWS = 2000; // drop-down for the first rows of the sheet

export async function templateXlsx(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  const data = workbook.addWorksheet("Attendance");
  data.addRow(TEMPLATE_COLUMNS.map((column) => column.header));
  data.getRow(1).font = { bold: true };
  data.views = [{ state: "frozen", ySplit: 1 }];
  TEMPLATE_COLUMNS.forEach((column, index) => {
    data.getColumn(index + 1).width = Math.max(14, column.header.length + 4);
  });
  data.getColumn(DATE_COLUMN).numFmt = "yyyy-mm-dd";
  for (const column of TIME_COLUMNS) data.getColumn(column).numFmt = "hh:mm";
  for (let row = 2; row <= VALIDATED_ROWS; row += 1) {
    data.getCell(`${STATUS_COLUMN_LETTER}${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"present,late,absent,excused"'],
    };
  }

  const notes = workbook.addWorksheet("Instructions");
  notes.getColumn(1).width = 18;
  notes.getColumn(2).width = 12;
  notes.getColumn(3).width = 90;
  notes.addRow(["Column", "Required", "What to enter"]).font = { bold: true };
  for (const column of COLUMNS) {
    notes.addRow([column.header, column.required ? "yes" : "optional", column.hint]);
  }
  notes.addRow([]);
  notes.addRow(["", "", "Fill in the 'Attendance' sheet, one row per student per class meeting, then upload the file."]);
  notes.addRow(["", "", "Uploading the same file again is safe: rows already imported are skipped or updated, never doubled."]);

  const written = await workbook.xlsx.writeBuffer();
  const copy = new ArrayBuffer(written.byteLength);
  new Uint8Array(copy).set(new Uint8Array(written));
  return copy;
}
