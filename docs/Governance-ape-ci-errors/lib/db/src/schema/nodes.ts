import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flowsTable } from "./flows";

export const nodesTable = pgTable("nodes", {
  id: serial("id").primaryKey(),
  flowId: integer("flow_id")
    .notNull()
    .references(() => flowsTable.id, { onDelete: "cascade" }),
  parentId: integer("parent_id"),
  branchLabel: text("branch_label"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  tidbit: text("tidbit").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertNodeSchema = createInsertSchema(nodesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodesTable.$inferSelect;
