import type { Config } from "drizzle-kit"

import { env } from "@/lib/env"

export default {
  schema: "./src/db/schemas/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  schemaFilter: ["workflowy"],
} satisfies Config
