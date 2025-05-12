import { pgSchema, text, timestamp } from "drizzle-orm/pg-core"

export const workflowySchema = pgSchema("workflowy")

export const brainlift = workflowySchema.table("brainlift", {
  id: text("id").primaryKey(),
  md: text("md").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
})
