# Presenza: Attendance Analytics System

## Purpose

Presenza organizes and analyzes class attendance data so users can see attendance patterns at a glance and find problems early. It stores attendance logs in one place and turns them into totals, rates, comparisons, and trends shown on a dashboard.

## Users

Instructors, class advisers, program chairs and deans, the guidance office, and school administrators. No login is needed.

## Data

The system uses one semester of attendance data. The data comes from a seeding script using Faker names, or from an uploaded file. No real student data is used.

Entities: Student, Instructor, Subject, Section, Schedule, ClassSession, AttendanceLog.

Each attendance log has a status of present, late, absent, or excused, plus time in, time out, and minutes late.

## Core Formula

Attendance rate equals present plus late, divided by total records minus excused. Late rate and absence rate use the same total. The same formula is used everywhere.

A student with an attendance rate below 80 percent counts as low attendance.

## Functions

1. Data import. Load data through a seeding script. File upload is an added feature that goes through the same import path.
2. Data storage. Keep all records in a PostgreSQL database.
3. Search and filter. Filter results by day, hour, week, month, subject, and section. Search students by name or student number.
4. Dashboard. Show the attendance rate, late rate, absence rate, and totals as soon as the system opens.
5. Charts. Show trends and comparisons using line and bar charts.
6. Reports. Show attendance per student, section, and subject, plus a list of students with low attendance.

## Pages

Dashboard, Trends, Comparisons, Reports.

## Charts Required

1. Daily attendance trend, line chart.
2. Weekly attendance trend, line chart.
3. Monthly attendance trend, line chart.
4. Absences by day of the week, bar chart.
5. Late arrivals by class hour, bar chart.
6. Attendance rate by subject, bar chart.
7. Attendance rate by section, bar chart.
8. Attendance status breakdown, share of present, late, absent, and excused.

## Reports Required

Student report with presents, lates, absences, and attendance rate. Section report. Subject report. Low attendance list for students below 80 percent.

## Patterns the Data Should Show

More absences on one day of the week. More late arrivals in early morning classes. Attendance dipping around exam periods. A realistic number of students below 80 percent. The dataset should include holidays, class suspensions, and different student attendance habits.

## Paper Blanks to Fill From the System

Total students and total attendance records. Overall attendance, late, and absence rates. The weekday with the highest absence rate. The attendance trend across the semester. The number of students below 80 percent.

## Ethics Rules the System Must Follow

Use generated data only. Collect no contact details or sensitive information. Use the data only for analyzing patterns, not to penalize anyone. Show results straight from the system with no manual edits. State that the dataset is synthetic.

## Future Work

Connect to RFID or QR code scanners so data updates daily.
