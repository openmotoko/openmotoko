import type { Config } from 'drizzle-kit'

export default {
	schema: [
		'./src/db/schema.ts',
		'./src/sessions/schema.ts',
		'./src/memory/schema.ts',
		'./src/scheduler/schema.ts',
		'./src/rag/schema.ts',
		'./src/webhooks/schema.ts',
		'./src/actionlog/schema.ts',
		'./src/autonomy/schema.ts',
		'./src/intents/schema.ts',
	],
	out: './drizzle',
	dialect: 'sqlite',
	dbCredentials: {
		url: process.env.OPENMOTOKO_DB_PATH ?? './data/openmotoko.db',
	},
} satisfies Config
