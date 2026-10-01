# Presenza: Data Model

ORM: Drizzle (existing). The schema lives in `db/schema/`, relations in `db/relations.ts`, plain-English table guide in `db/SCHEMA.md`. This document explains how the 7 spec entities map onto it, what must change, and why.

## 1. Entity mapping

| Spec entity | Table | Notes |
| --- | --- | --- |
| Student | `students` | `student_no` unique, first/last name |
| Instructor | `instructors` | |
| Subject | `subjects` | catalog entry, `code` unique |
| Section | `class_sections` | e.g. "BSIT 3-A" in a term |
| Schedule | `class_schedules` | weekly meeting pattern: `day_of_week`, `start_time`, `end_time` |
| ClassSession | `class_sessions` | one real meeting on a date; has `start_hour`, `week_start`, `month_start`, `session_status` |
| AttendanceLog | `attendance_logs` | `status`, `time_in`, `time_out`, `minutes_late` |

Supporting tables kept as they are: `academic_years`, `terms`, `calendar_dates`, `calendar_events`, `departments`, `programs`, `buildings`, `rooms`, `classes`, `class_enrollments`, `section_students`, `curriculum_subjects`.

Why keep them: the spec needs holidays, class suspensions, and exam periods in the data (`calendar_events`, `calendar_dates.period`), and a "class" (`classes`) is what links a subject, a section, and an instructor. Without it, "attendance by subject" and "attendance by section" would not be joinable. Removing them would mean re-deriving the same concepts in a worse place.

## 2. How a log reaches each filter

```
attendance_logs ──► class_sessions ──► classes ──► subjects          (subject filter)
      │                 │   │            └──────► class_sections    (section filter)
      │                 │   └ start_hour (hour), week_start (week), month_start (month),
      │                 │     session_date (range), day_of_week (day)
      └──► students     └──► class_schedules (start_time for minutes_late in 3B)
```

| Filter | Column | Index |
| --- | --- | --- |
| Day of week | `class_sessions.day_of_week` (**new**, 1=Mon..7=Sun) | **new** |
| Hour | `class_sessions.start_hour` | exists |
| Week | `class_sessions.week_start` (Monday date) | exists |
| Month | `class_sessions.month_start` (1st of month) | exists |
| Subject | `classes.subject_id` | leading column of existing unique; also add plain index |
| Section | `classes.class_section_id` | **new** |
| Date range | `class_sessions.session_date` | exists |
| Student search | `students.student_no` (unique), `first_name`, `last_name` | unique exists; names via `ILIKE`, no index (see below) |

## 3. Schema changes (implemented in db/schema/)

All of these are additive. I write the schema edits; **you run the migration**.

1. **`deleted boolean not null default false` on all 19 tables**, including the two junction tables. Spec says every model gets a soft-delete flag.
2. **New indexes**
   - `class_sessions(day_of_week)` (done)
   - `classes(class_section_id)`
   - `classes(subject_id)`
   - `attendance_logs(session_id, status)`: the dominant query shape is "logs of these sessions, grouped by status"
   - `class_schedules(class_id)` and `class_schedules(day_of_week)`
3. **No standalone index on `deleted`.** A boolean where ~100% of rows are `false` has almost no selectivity; the planner would ignore it. The filter is applied alongside the indexed columns above.
4. **No trigram index for name search.** At the size of one semester (hundreds to low thousands of students) a sequential scan with `ILIKE` is milliseconds. Revisit only if it is measured to be slow.

## 4. Soft delete rules

- Nothing is ever hard-deleted by the app. "Delete" sets `deleted = true`.
- Every analytics query excludes a row if **any** table in its join path is deleted (a deleted student's logs, a deleted session's logs, a deleted class's sessions all disappear from every number). This is centralized in `filters.ts` so no query can forget it.
- Existing `UNIQUE` constraints (e.g. `attendance_logs(session_id, student_id)`, `students(student_no)`) still apply to soft-deleted rows. So re-importing a row whose earlier version was soft-deleted must **revive and update** that row, not insert a second one. I chose this over converting every unique to a partial unique index (`WHERE deleted = false`), because it needs far fewer schema edits. See DECISIONS D-05.
- Existing `ON DELETE CASCADE` FKs stay; they only matter for manual DB operations.

## 5. Facts the analytics rely on

- `attendance_logs.status` is one of `present | late | absent | excused` (enum `attendance_status`).
- `class_sessions.session_status` is `held | cancelled | makeup`. Cancelled sessions are excluded from every rate (nothing happened, no one was absent). Holidays/suspensions produce `cancelled` sessions or no session at all; either way they never count.
- `start_hour`, `week_start`, `month_start`, `time_in_hour`, `minutes_late` are precomputed columns that the writer (import service) is responsible for filling. Analytics read them and never recompute dates.
- A student with zero non-excused records has an undefined rate (`null`), is shown as "n/a", and is **not** listed as low attendance.

## 6. Out of scope for the schema

No contact details, no addresses, no guardian info, no photos (ethics rule: collect no sensitive information). `students` has `sex` and `residence_type` already; analytics do not use them and they stay optional.

## 7. Additions for Step 3B (planned, not yet in the schema)

- New table **`import_batches`**: `id`, `file_name`, `file_kind` (csv or xlsx), `rows_read`, `rows_imported`, `rows_invalid`, `logs_created`, `logs_updated`, `logs_unchanged`, `created_at` (default now), `created_ids` (jsonb: ids of the students, subjects, sections, classes, schedules, sessions, and section links this import created, used by undo), plus `deleted`.
- New column **`attendance_logs.import_batch_id`**: nullable integer FK to `import_batches`, indexed. Null for logs not made by an import.
- Both are additive and nullable, so `db:push` needs no backfill. Existing rows keep `import_batch_id = null`, so they cannot be undone individually, only cleared with Clear all.
- The importer relies on the existing `UNIQUE(session_id, student_id)` for re-upload safety, and revives soft-deleted rows rather than inserting duplicates (see D-05).
