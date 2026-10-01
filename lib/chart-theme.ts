// Chart colors come from CSS variables in app/theme.css, never from literals.
export const chartTheme = {
  series: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"],
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  status: {
    present: "var(--status-present)",
    late: "var(--status-late)",
    absent: "var(--status-absent)",
    excused: "var(--status-excused)",
  },
} as const;
