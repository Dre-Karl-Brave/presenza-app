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
