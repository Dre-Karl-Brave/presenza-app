// Date and time helpers for the importer. Dates are "YYYY-MM-DD" strings and
// times are minutes since midnight. All date math is done in UTC so the
// server's time zone can never shift a calendar day.

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function toUtc(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isRealDate(isoDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return false;
  return toIsoDate(toUtc(isoDate)) === isoDate;
}

function tryIso(year: number, month: number, day: number): string | null {
  const iso = `${year}-${pad(month)}-${pad(day)}`;
  return isRealDate(iso) ? iso : null;
}

const MONTH_ABBRS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function monthFromName(name: string): number | null {
  return MONTH_ABBRS[name.slice(0, 3).toLowerCase()] ?? null;
}

// Pivot matches the common strtotime/Excel convention: 00-68 -> 2000s, 69-99 -> 1900s.
function expandYear(yearText: string): number {
  if (yearText.length === 4) return Number(yearText);
  const yy = Number(yearText);
  return yy <= 68 ? 2000 + yy : 1900 + yy;
}

/**
 * Accepts common date text formats and returns the ISO YYYY-MM-DD equivalent,
 * or null if the input cannot be parsed. Supported formats:
 *   YYYY-MM-DD, YYYY/MM/DD
 *   MM/DD/YYYY, M/D/YYYY  (US slash — default when day and month are both ≤ 12)
 *   DD/MM/YYYY, D/M/YYYY  (EU slash — used when first number > 12)
 *   MM-DD-YYYY, DD-MM-YYYY (same logic with dashes)
 *   DD Mon YYYY, Mon DD YYYY, DD Month YYYY, Month DD YYYY
 *   Any of the slash/dash forms above also accept a 2-digit year (e.g. 8/17/26).
 */
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return isRealDate(s) ? s : null;

  // YYYY/MM/DD
  const ymdSlash = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (ymdSlash) return tryIso(Number(ymdSlash[1]), Number(ymdSlash[2]), Number(ymdSlash[3]));

  // MM/DD/YYYY or DD/MM/YYYY (slash or dot separators, 1- or 2-digit parts, 2- or 4-digit year)
  const dmySlash = /^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4}|\d{2})$/.exec(s);
  if (dmySlash) {
    const a = Number(dmySlash[1]);
    const b = Number(dmySlash[2]);
    const yr = expandYear(dmySlash[3]);
    if (a > 12) return tryIso(yr, b, a); // first part is definitely day
    if (b > 12) return tryIso(yr, a, b); // second part is definitely day
    return tryIso(yr, a, b); // ambiguous — treat as MM/DD (US default)
  }

  // MM-DD-YYYY or DD-MM-YYYY (dash separators, guards against matching YYYY-MM-DD above)
  const dmyDash = /^(\d{1,2})-(\d{1,2})-(\d{4}|\d{2})$/.exec(s);
  if (dmyDash) {
    const a = Number(dmyDash[1]);
    const b = Number(dmyDash[2]);
    const yr = expandYear(dmyDash[3]);
    if (a > 12) return tryIso(yr, b, a);
    if (b > 12) return tryIso(yr, a, b);
    return tryIso(yr, a, b); // ambiguous — treat as MM-DD
  }

  // "Jan 5, 2024" / "January 5 2024" / "Jan 05 2024"
  const mNameFirst = /^([A-Za-z]+)\s+(\d{1,2})[,\s]+(\d{4})$/.exec(s);
  if (mNameFirst) {
    const month = monthFromName(mNameFirst[1]);
    if (month) return tryIso(Number(mNameFirst[3]), month, Number(mNameFirst[2]));
  }

  // "5 Jan 2024" / "05 January 2024"
  const dFirst = /^(\d{1,2})\s+([A-Za-z]+)[,\s]+(\d{4})$/.exec(s);
  if (dFirst) {
    const month = monthFromName(dFirst[2]);
    if (month) return tryIso(Number(dFirst[3]), month, Number(dFirst[1]));
  }

  return null;
}

export function addDays(isoDate: string, days: number): string {
  return toIsoDate(new Date(toUtc(isoDate).getTime() + days * DAY_MS));
}

// 1 = Monday ... 7 = Sunday
export function isoDayOfWeek(isoDate: string): number {
  const day = toUtc(isoDate).getUTCDay();
  return day === 0 ? 7 : day;
}

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek - 1] ?? String(dayOfWeek);
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}

export function weekStart(isoDate: string): string {
  return addDays(isoDate, 1 - isoDayOfWeek(isoDate));
}

export function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

// ISO 8601 week number (the week containing the year's first Thursday is week 1).
export function isoWeekNumber(isoDate: string): number {
  const thursday = toUtc(addDays(isoDate, 4 - isoDayOfWeek(isoDate)));
  const yearStart = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  return Math.ceil(((thursday.getTime() - yearStart) / DAY_MS + 1) / 7);
}

export function dateParts(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day, quarter: Math.ceil(month / 3) };
}

// ---- Times (minutes since midnight) ----

export function parseTime(text: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return hours * 60 + minutes;
}

export function formatTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`;
}

export function roundToHalfHour(minutes: number): number {
  return Math.round(minutes / 30) * 30;
}

// Wall-clock moment stored in a "timestamp without time zone" column.
// Built with Date.UTC so the stored clock time equals what the file says.
export function wallClock(isoDate: string, minutes: number): Date {
  const { year, month, day } = dateParts(isoDate);
  return new Date(Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60));
}

// ---- Terms ----

export type TermSlot = {
  academicYearLabel: string;
  termType: "first_semester" | "second_semester" | "summer";
  startDate: string;
  endDate: string;
};

// Aug-Dec: first semester of Y-(Y+1). Jan-May: second semester of (Y-1)-Y.
// Jun-Jul: summer of (Y-1)-Y.
export function termSlotFor(isoDate: string): TermSlot {
  const { year, month } = dateParts(isoDate);
  if (month >= 8) {
    return {
      academicYearLabel: `${year}-${year + 1}`,
      termType: "first_semester",
      startDate: `${year}-08-01`,
      endDate: `${year}-12-31`,
    };
  }
  const label = `${year - 1}-${year}`;
  if (month <= 5) {
    return { academicYearLabel: label, termType: "second_semester", startDate: `${year}-01-01`, endDate: `${year}-05-31` };
  }
  return { academicYearLabel: label, termType: "summer", startDate: `${year}-06-01`, endDate: `${year}-07-31` };
}

export function academicYearBounds(label: string): { startDate: string; endDate: string } {
  const [startYear, endYear] = label.split("-").map(Number);
  return { startDate: `${startYear}-08-01`, endDate: `${endYear}-07-31` };
}
