export type ColumnKey =
  | "studentNo"
  | "studentName"
  | "subjectCode"
  | "section"
  | "date"
  | "timeIn"
  | "timeOut"
  | "status"
  | "classStart"
  | "classEnd"
  | "minutesLate";

export type ColumnSpec = {
  key: ColumnKey;
  header: string; // as written in the template and in error messages
  required: boolean;
  inTemplate: boolean;
  aliases: string[]; // extra accepted header spellings (normalized form)
  hint: string; // shown on the template's instructions sheet
};

export const COLUMNS: ColumnSpec[] = [
  {
    key: "studentNo",
    header: "student number",
    required: true,
    inTemplate: true,
    aliases: ["studentno", "studentnum", "studentid"],
    hint: "Unique ID of the student, up to 20 characters.",
  },
  {
    key: "studentName",
    header: "student name",
    required: true,
    inTemplate: true,
    aliases: ["name", "fullname"],
    hint: "Either 'Last, First' or 'First Last'.",
  },
  {
    key: "subjectCode",
    header: "subject code",
    required: true,
    inTemplate: true,
    aliases: ["subject", "subjectid"],
    hint: "Subject code, up to 15 characters, e.g. IT301.",
  },
  {
    key: "section",
    header: "section",
    required: true,
    inTemplate: true,
    aliases: ["sectionname", "block"],
    hint: "Section name, up to 30 characters, e.g. BSIT 3-A.",
  },
  {
    key: "date",
    header: "date",
    required: true,
    inTemplate: true,
    aliases: ["classdate", "sessiondate"],
    hint: "Class date as YYYY-MM-DD (a real date cell also works in Excel).",
  },
  {
    key: "timeIn",
    header: "time in",
    required: true,
    inTemplate: true,
    aliases: ["in", "timearrived", "arrival"],
    hint: "HH:MM. Needed for present and late; ignored for absent and excused.",
  },
  {
    key: "timeOut",
    header: "time out",
    required: true,
    inTemplate: true,
    aliases: ["out", "timeleft", "departure"],
    hint: "HH:MM. Optional. Must not be before time in.",
  },
  {
    key: "status",
    header: "status",
    required: true,
    inTemplate: true,
    aliases: ["attendance", "attendancestatus"],
    hint: "present, late, absent, or excused.",
  },
  {
    key: "classStart",
    header: "class start",
    required: false,
    inTemplate: true,
    aliases: ["starttime", "schedulestart"],
    hint: "Optional HH:MM. When the class starts. Give both class start and class end, or neither.",
  },
  {
    key: "classEnd",
    header: "class end",
    required: false,
    inTemplate: true,
    aliases: ["endtime", "scheduleend"],
    hint: "Optional HH:MM. When the class ends.",
  },
  {
    key: "minutesLate",
    header: "minutes late",
    required: false,
    inTemplate: false,
    aliases: ["minslate", "lateminutes"],
    hint: "Optional whole number. If missing it is calculated from the class start.",
  },
];

export const TEMPLATE_COLUMNS = COLUMNS.filter((column) => column.inTemplate);

export function columnHeader(key: ColumnKey): string {
  return COLUMNS.find((column) => column.key === key)?.header ?? key;
}

// "Student No." -> "studentno"
export function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export type HeaderMap = {
  indexByKey: Map<ColumnKey, number>;
  missing: string[]; // headers of required columns that were not found
};

export function mapHeaders(headers: string[]): HeaderMap {
  const indexByKey = new Map<ColumnKey, number>();
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized === "") return;
    const spec = COLUMNS.find(
      (column) => normalizeHeader(column.header) === normalized || column.aliases.includes(normalized),
    );
    if (spec && !indexByKey.has(spec.key)) indexByKey.set(spec.key, index);
  });
  const missing = COLUMNS.filter((column) => column.required && !indexByKey.has(column.key)).map(
    (column) => column.header,
  );
  return { indexByKey, missing };
}
