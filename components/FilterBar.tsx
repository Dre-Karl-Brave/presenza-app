"use client";

import type { ReactNode } from "react";
import { filterValue, useFilters, type FilterKey } from "@/lib/filters";
import { formatMonth, formatWeek } from "@/lib/format";
import { useFilterOptions } from "@/lib/queries";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Select({
  label,
  filterKey,
  children,
}: {
  label: string;
  filterKey: FilterKey;
  children: ReactNode;
}) {
  const { filter, setFilter } = useFilters();
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <select
        className="input"
        value={filterValue(filter, filterKey)}
        onChange={(event) => setFilter(filterKey, event.target.value)}
      >
        <option value="">All</option>
        {children}
      </select>
    </label>
  );
}

export function FilterBar() {
  const { reset, hasFilters } = useFilters();
  const { data: options } = useFilterOptions();

  return (
    <div className="card">
      <div className="filter-bar" role="group" aria-label="Filters">
        <Select label="Day of week" filterKey="dayOfWeek">
          {DAYS.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select label="Class hour" filterKey="hour">
          {options?.hours.map((hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}:00
            </option>
          ))}
        </Select>
        <Select label="Week" filterKey="week">
          {options?.weeks.map((week) => (
            <option key={week} value={week}>
              {formatWeek(week)}
            </option>
          ))}
        </Select>
        <Select label="Month" filterKey="month">
          {options?.months.map((month) => (
            <option key={month} value={month}>
              {formatMonth(month)}
            </option>
          ))}
        </Select>
        <Select label="Subject" filterKey="subjectId">
          {options?.subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code} · {subject.title}
            </option>
          ))}
        </Select>
        <Select label="Section" filterKey="sectionId">
          {options?.sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </Select>
        <button type="button" className="button" onClick={reset} disabled={!hasFilters}>
          Clear filters
        </button>
      </div>
    </div>
  );
}
