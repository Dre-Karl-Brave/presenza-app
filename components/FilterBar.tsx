"use client";

import { filterValue, useFilters, type FilterKey } from "@/lib/filters";
import { formatMonth, formatWeek } from "@/lib/format";
import { useFilterOptions } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function FilterSelect({
  label,
  filterKey,
  children,
}: {
  label: string;
  filterKey: FilterKey;
  children: React.ReactNode;
}) {
  const { filter, setFilter } = useFilters();
  const current = filterValue(filter, filterKey);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.5px]">
        {label}
      </span>
      <Select
        value={current === "" ? ALL : current}
        onValueChange={(val) => setFilter(filterKey, val === ALL ? "" : val)}
      >
        <SelectTrigger size="sm" className="min-w-[120px] h-7 text-[12.5px] rounded-[5px]">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent position="popper">
          <SelectItem value={ALL}>All</SelectItem>
          {children}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterBar() {
  const { reset, hasFilters } = useFilters();
  const { data: options } = useFilterOptions();

  return (
    <div
      className="flex flex-wrap items-end gap-3 bg-card border border-border rounded-[6px] px-[18px] py-3"
      role="group"
      aria-label="Filters"
    >
      <FilterSelect label="Day" filterKey="dayOfWeek">
        {DAYS.map((name, i) => (
          <SelectItem key={name} value={String(i + 1)}>
            {name}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect label="Hour" filterKey="hour">
        {options?.hours.map((hour) => (
          <SelectItem key={hour} value={String(hour)}>
            {String(hour).padStart(2, "0")}:00
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect label="Week" filterKey="week">
        {options?.weeks.map((week) => (
          <SelectItem key={week} value={week}>
            {formatWeek(week)}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect label="Month" filterKey="month">
        {options?.months.map((month) => (
          <SelectItem key={month} value={month}>
            {formatMonth(month)}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect label="Subject" filterKey="subjectId">
        {options?.subjects.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.code} · {s.title}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect label="Section" filterKey="sectionId">
        {options?.sections.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.name}
          </SelectItem>
        ))}
      </FilterSelect>

      <div className="flex flex-col justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={reset}
          disabled={!hasFilters}
          className="h-7 text-[12.5px] rounded-[5px]"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
