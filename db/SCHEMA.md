# Schema Overview

Plain-English guide to every table and how they connect. See `db/schema/` for the actual column definitions.

## Academic Calendar

**academic_years** — a school year, like "2026-2027".
- Connects to: `terms` (one academic year has many terms)

**terms** — a chunk of a school year (1st semester, 2nd semester, summer).
- Connects to: `academic_years` (belongs to one), `calendar_dates`, `class_sections`, `classes`

**calendar_dates** — one row per actual calendar day, used to know if it's a class day, what week/month it falls in, etc.
- Connects to: `terms` (optionally belongs to one), `calendar_events`, `class_sessions`

**calendar_events** — a specific day marked as a holiday, suspension, exam day, etc.
- Connects to: `calendar_dates` (happens on one)

## Organization & Facilities

**departments** — an academic department, like "College of Computer Studies".
- Connects to: `programs`, `instructors`, `subjects`

**programs** — a degree program, like "BSIT".
- Connects to: `departments` (belongs to one), `students`, `curriculum_subjects`, `class_sections`

**buildings** — a physical building on campus.
- Connects to: `rooms`

**rooms** — a specific room inside a building.
- Connects to: `buildings` (belongs to one), `class_schedules`, `class_sessions`

## People

**instructors** — a teacher.
- Connects to: `departments` (belongs to one), `class_sections` (as adviser), `classes` (as the one teaching)

**students** — a student.
- Connects to: `programs` (belongs to one), `section_students`, `class_enrollments`, `attendance_logs`

## Subjects & Classes

**subjects** — a course catalog entry, like "Data Structures".
- Connects to: `departments` (belongs to one), `curriculum_subjects`, `classes`

**class_sections** — a block/batch of students, like "BSIT 3-A" for a given term.
- Connects to: `programs` (belongs to one), `terms` (belongs to one), `instructors` (has one adviser), `section_students`, `classes`

**classes** — a specific subject being taught to a specific section by a specific instructor in a specific term.
- Connects to: `subjects`, `class_sections`, `instructors`, `terms` (all belongs-to-one), `class_schedules`, `class_enrollments`, `class_sessions`

**class_schedules** — the weekly meeting pattern for a class (e.g. lecture Mon/Wed 9-10am in room X).
- Connects to: `classes` (belongs to one), `rooms` (belongs to one), `class_sessions`

## Junction Tables (many-to-many links)

**curriculum_subjects** — which subjects a program requires, and in which year/term.
- Links: `programs` ↔ `subjects`

**section_students** — which students are in which class section.
- Links: `class_sections` ↔ `students`

**class_enrollments** — which students are enrolled in which specific class (plus when they enrolled/dropped).
- Links: `classes` ↔ `students`

## Sessions & Attendance

**class_sessions** — one row per actual class meeting that happened (or was cancelled) on a specific date.
- Connects to: `classes`, `class_schedules`, `rooms`, `calendar_dates` (all belongs-to-one), `attendance_logs`

**attendance_logs** — the core record: one row per student per session, tracking if they were present/late/absent/excused, time in/out, etc.
- Connects to: `class_sessions` (belongs to one), `students` (belongs to one)

## Connection Map (simplified)

The whole schema funnels toward one goal: recording, for every student, whether they showed up to a specific class meeting.

```
department
  ├─ program ─── student
  ├─ instructor
  └─ subject

program + term ──► class_section ──► class ◄── subject
                         │              │          ▲
                         ▼              ▼          │
                    (students in     class_schedule │
                     the section,    (when/where    │
                     via section_     it meets,      │
                     students)        via room)      │
                                         │            │
                                         ▼            │
                                   class_session ──────┘
                                   (one real meeting
                                    on a calendar_date)
                                         │
                                         ▼
                                  attendance_log
                                  (one student's
                                   record for that
                                   meeting)
```

Enrollment path: a `student` joins a `class` through `class_enrollment`, and is placed into a `class_section` through `section_students`. A `program`'s required subjects are defined through `curriculum_subjects`.
