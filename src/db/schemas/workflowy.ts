import { integer, json, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const workflowySchema = pgSchema("workflowy")

export const metaData = workflowySchema.table("meta_data", {
  id: text("id").primaryKey(),
  createdBy: integer("created_by").notNull(),
  updatedBy: integer("updated_by").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})

export const treeData = workflowySchema.table("tree_data", {
  id: uuid("id").primaryKey(), // "id"
  contents: text("contents").notNull(), // "nm"
  priority: integer("priority").notNull(), // "pr"
  parentId: uuid("parent_id"), // "prnt"
  metadata: json("metadata").notNull().default("{}"), // "metadata"
  createdBy: integer("created_by").notNull(), // "cb"
  updatedBy: integer("updated_by").notNull(), // "lmb"
  createdAt: timestamp("created_at").notNull(), // "ct"
  updatedAt: timestamp("updated_at").notNull(), // "lmb"
})
