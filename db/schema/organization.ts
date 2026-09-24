import { pgTable, serial, integer, smallint, varchar } from "drizzle-orm/pg-core";
import { roomTypeEnum } from "./enums";

export const departments = pgTable("departments", {
  id: serial("department_id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(), // "CCS"
  name: varchar("name", { length: 100 }).notNull(),
});

export const programs = pgTable("programs", {
  id: serial("program_id").primaryKey(),
  departmentId: integer("department_id")
    .notNull()
    .references(() => departments.id),
  code: varchar("code", { length: 15 }).notNull().unique(), // "BSIT"
  name: varchar("name", { length: 150 }).notNull(),
  yearsToComplete: smallint("years_to_complete").notNull().default(4),
});

export const buildings = pgTable("buildings", {
  id: serial("building_id").primaryKey(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("room_id").primaryKey(),
  buildingId: integer("building_id")
    .notNull()
    .references(() => buildings.id),
  roomCode: varchar("room_code", { length: 20 }).notNull().unique(), // "MB-301"
  roomType: roomTypeEnum("room_type").notNull(),
  floor: smallint("floor"),
  capacity: smallint("capacity").notNull(),
});
