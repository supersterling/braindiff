import { db } from "@/db"
import { Errors } from "@/errors"
import { loadEnvConfig } from "@next/env"
import { sql } from "drizzle-orm"

const projectDir = process.cwd()
loadEnvConfig(projectDir)

async function dropSchemas(schemaNames: string[]) {
	if (schemaNames.length === 0) {
		console.log("No schemas specified to drop.")
		process.exit(0)
	}

	let success = true

	for (const schemaName of schemaNames) {
		if (!schemaName.trim()) {
			console.warn("Skipping empty schema name.")
			continue
		}

		const result = await Errors.try(
			db.execute(
				sql`DROP SCHEMA IF EXISTS ${sql.identifier(schemaName)} CASCADE`
			)
		)
		if (result.error) {
			console.error(`Error dropping schema ${schemaName}:`, result.error)
			success = false
		} else {
			console.log(`Successfully dropped schema: ${schemaName}`)
		}
	}

	if (success) {
		console.log("All specified schemas dropped successfully.")
		process.exit(0)
	} else {
		console.error("Some schemas failed to drop.")
		process.exit(1)
	}
}

const schemaNames = process.argv.slice(2)
dropSchemas(schemaNames)
