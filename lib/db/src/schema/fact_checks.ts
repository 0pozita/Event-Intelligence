import { pgTable, text, serial, timestamp, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { claimsTable } from "./claims";

export interface FactCheckSource {
  title: string;
  url: string;
  publisher: string;
  snippet: string;
  supportsClaim: boolean;
  credibilityScore: number;
}

export interface FactCheckEvidenceItem {
  text: string;
  source: FactCheckSource;
}

export interface FactCheckTimelineItem {
  date: string;
  event: string;
}

export const factChecksTable = pgTable("fact_checks", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().references(() => claimsTable.id, { onDelete: "cascade" }),
  verdict: text("verdict").notNull().default("Unverified"),
  trustScore: real("trust_score").notNull().default(0),
  trustRating: text("trust_rating").notNull().default("Low"),
  reasoning: text("reasoning").notNull(),
  provider: text("provider").notNull().default("mock"),
  evidenceSummary: text("evidence_summary"),
  claimType: text("claim_type"),
  summary: text("summary"),
  supportingEvidence: jsonb("supporting_evidence").$type<FactCheckEvidenceItem[]>(),
  contradictingEvidence: jsonb("contradicting_evidence").$type<FactCheckEvidenceItem[]>(),
  sources: jsonb("sources").$type<FactCheckSource[]>(),
  timeline: jsonb("timeline").$type<FactCheckTimelineItem[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFactCheckSchema = createInsertSchema(factChecksTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFactCheck = z.infer<typeof insertFactCheckSchema>;
export type FactCheck = typeof factChecksTable.$inferSelect;
