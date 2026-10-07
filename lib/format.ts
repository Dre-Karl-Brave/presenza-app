// Presentation-only formatting. No calculations of attendance figures happen here.

const EMPTY = "n/a";

export type DateFormat = "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY";

export function formatDate(date: Date, fmt: DateFormat = "YYYY-MM-DD"): string {
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  if (fmt === "MM/DD/YYYY") return `${mm}/${dd}/${yyyy}`;
  if (fmt === "DD/MM/YYYY") return `${dd}/${mm}/${yyyy}`;
  return `${yyyy}-${mm}-${dd}`;
}

export function formatPercent(rate: number | null | undefined, digits = 1): string {
  if (rate === null || rate === undefined) return EMPTY;
  return `${(rate * 100).toFixed(digits)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split("-");
  const date = new Date(Number(year), Number(monthNumber) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatWeek(weekStart: string): string {
  return `Week of ${weekStart}`;
}
