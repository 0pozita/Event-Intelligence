import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { claimsTable } from "./claims";
import { sourcesTable } from "./sources";

export const evidenceTable = pgTable("evidence", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().references(() => claimsTable.id, { onDelete: "cascade" }),
  sourceId: integer("source_id").references(() => sourcesTable.id, { onDelete: "set null" }),
  text: text("text").notNull(),
  strength: text("strength").notNull().default("medium"),
  url: text("url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEvidenceSchema = createInsertSchema(evidenceTable).omit({ id: true, createdAt: true });
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidenceTable.$inferSelect;
