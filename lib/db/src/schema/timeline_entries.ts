import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eventsTable } from "./events";

export const timelineEntriesTable = pgTable("timeline_entries", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => eventsTable.id, { onDelete: "cascade" }),
  date: timestamp("date", { withTimezone: true }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sourceId: integer("source_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimelineEntrySchema = createInsertSchema(timelineEntriesTable).omit({ id: true, createdAt: true });
export type InsertTimelineEntry = z.infer<typeof insertTimelineEntrySchema>;
export type TimelineEntry = typeof timelineEntriesTable.$inferSelect;
