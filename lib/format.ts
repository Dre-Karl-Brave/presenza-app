// Presentation-only formatting. No calculations of attendance figures happen here.

const EMPTY = "n/a";

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
