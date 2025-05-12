import { index, pgSchema, text, timestamp } from "drizzle-orm/pg-core"

export const workflowySchema = pgSchema("workflowy")

export const brainlifts = workflowySchema.table(
  "brainlifts",
  {
    id: text("id").primaryKey(),
    md: text("md").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_brainlifts_id").on(table.id)],
)
