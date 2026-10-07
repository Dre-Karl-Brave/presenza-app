"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState } from "@/components/StateView";
import { chartTheme } from "@/lib/chart-theme";
import { sharePoints } from "@/lib/chart-data";
import { formatNumber, formatPercent } from "@/lib/format";
import { useStatusBreakdown, useSummary } from "@/lib/queries";
import { statusOf } from "@/lib/status";
import { cn } from "@/lib/utils";

function KpiCard({
  label,
  value,
  loading,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  loading?: boolean;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-2 h-10 w-24 rounded" />
        ) : (
          <p className={cn("mt-2 text-[2.5rem] font-bold leading-none tabular-nums", valueClass)}>
            {value}
          </p>
        )}
        {sub && !loading ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
        {loading ? <Skeleton className="mt-2 h-3 w-32 rounded" /> : null}
      </CardContent>
    </Card>
  );
}

function CountCard({
  label,
  value,
  loading,
  accent,
}: {
  label: string;
  value: string;
  loading?: boolean;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1.5 h-7 w-14 rounded" />
        ) : (
          <p className={cn("mt-1.5 text-2xl font-bold tabular-nums", accent)}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusRow({
  label,
  count,
  pct,
  color,
}: {
  label: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ background: color }}
          />
          <span className="font-medium text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground tabular-nums">
          <span className="text-xs">{formatNumber(count)}</span>
          <span className="w-10 text-right font-semibold text-foreground">{pct}%</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        />
      </div>
    </div>
  );
}

function Fact({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {loading ? (
        <>
          <Skeleton className="mt-1 h-7 w-20 rounded" />
          {sub ? <Skeleton className="mt-0.5 h-3 w-28 rounded" /> : null}
        </>
      ) : (
        <>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
        </>
      )}
    </div>
  );
}

export function DashboardView() {
  const summary = useSummary();
  const breakdown = useStatusBreakdown();
  const data = summary.data;
  const loading = summary.isPending || summary.isPlaceholderData;
  const noRecords = data !== undefined && data.stats.total === 0;
  const shares = breakdown.data ? sharePoints(breakdown.data) : [];
  const bdStatus = statusOf(breakdown, (v) => v.stats.total === 0);

  if (summary.isError) {
    return (
      <>
        <FilterBar />
        <Card>
          <CardContent className="pt-6">
            <EmptyState title="Could not load" message={summary.error.message} />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <FilterBar />

      {noRecords ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="No attendance records yet"
              message="Import a file on the Import page and the figures will appear here."
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Row 1 — primary rate KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="grid grid-cols-2 gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label="Attendance rate"
          value={formatPercent(data?.stats.attendanceRate)}
          loading={loading}
          sub="Present + late ÷ non-excused"
          valueClass="text-primary"
        />
        <KpiCard
          label="Late rate"
          value={formatPercent(data?.stats.lateRate)}
          loading={loading}
          sub={data ? `${formatNumber(data.stats.late)} late arrivals` : undefined}
        />
        <KpiCard
          label="Absence rate"
          value={formatPercent(data?.stats.absenceRate)}
          loading={loading}
          sub={data ? `${formatNumber(data.stats.absent)} absences` : undefined}
          valueClass={
            data?.stats.absenceRate != null && data.stats.absenceRate > 0.1
              ? "text-destructive"
              : undefined
          }
        />
        <KpiCard
          label="Students at risk"
          value={data ? formatNumber(data.lowAttendanceCount) : "0"}
          loading={loading}
          sub="Below 80% attendance"
          valueClass={
            data?.lowAttendanceCount && data.lowAttendanceCount > 0
              ? "text-destructive"
              : undefined
          }
        />
      </motion.div>

      {/* Row 2 — raw counts */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.06 }}
        className="grid grid-cols-3 gap-4 sm:grid-cols-6"
      >
        <CountCard
          label="Present"
          value={data ? formatNumber(data.stats.present) : "0"}
          loading={loading}
          accent="text-[#16a34a]"
        />
        <CountCard
          label="Late"
          value={data ? formatNumber(data.stats.late) : "0"}
          loading={loading}
          accent="text-[#d97706]"
        />
        <CountCard
          label="Absent"
          value={data ? formatNumber(data.stats.absent) : "0"}
          loading={loading}
          accent="text-destructive"
        />
        <CountCard
          label="Excused"
          value={data ? formatNumber(data.stats.excused) : "0"}
          loading={loading}
        />
        <CountCard
          label="Students"
          value={data ? formatNumber(data.totalStudents) : "0"}
          loading={loading}
        />
        <CountCard
          label="Records"
          value={data ? formatNumber(data.stats.total) : "0"}
          loading={loading}
        />
      </motion.div>

      {/* Row 3 — breakdown + facts */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut", delay: 0.12 }}
        className="grid gap-4 lg:grid-cols-[1fr_240px]"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Attendance breakdown</CardTitle>
            <p className="text-xs text-muted-foreground">
              Share of all records by status, including excused.
            </p>
          </CardHeader>
          <CardContent>
            {bdStatus === "loading" ? (
              <div className="flex flex-col gap-5" role="status" aria-label="Loading breakdown…">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : bdStatus === "empty" ? (
              <EmptyState message="No records match these filters." />
            ) : (
              <div className="flex flex-col gap-5">
                {shares.map((s) => (
                  <StatusRow
                    key={s.key}
                    label={s.label}
                    count={s.count}
                    pct={s.value}
                    color={chartTheme.status[s.key]}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col gap-4">
              <Fact
                label="Total students"
                value={data ? formatNumber(data.totalStudents) : "—"}
                loading={loading}
              />
              <div className="border-t border-border pt-4">
                <Fact
                  label="Total records"
                  value={data ? formatNumber(data.stats.total) : "—"}
                  sub={data ? `${formatNumber(data.stats.excused)} excused` : undefined}
                  loading={loading}
                />
              </div>
              <div className="border-t border-border pt-4">
                <Fact
                  label="Worst absence day"
                  value={data?.highestAbsenceWeekday?.name ?? "—"}
                  sub={
                    data?.highestAbsenceWeekday
                      ? `${formatPercent(data.highestAbsenceWeekday.absenceRate)} absence rate`
                      : undefined
                  }
                  loading={loading}
                />
              </div>
              <div className="border-t border-border pt-4">
                <Fact
                  label="Counted records"
                  value={data ? formatNumber(data.stats.counted) : "—"}
                  sub="Excludes excused"
                  loading={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
