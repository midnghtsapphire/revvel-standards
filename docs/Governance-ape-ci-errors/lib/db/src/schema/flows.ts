import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flowsTable = pgTable("flows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFlowSchema = createInsertSchema(flowsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFlow = z.infer<typeof insertFlowSchema>;
export type Flow = typeof flowsTable.$inferSelect;
