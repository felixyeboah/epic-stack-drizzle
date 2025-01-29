import path from 'node:path'
import fsExtra from 'fs-extra'
import { afterAll, beforeEach } from 'vitest'
import { BASE_DATABASE_PATH } from './global-setup.ts'

const databaseFile = `./tests/drizzle/data.${process.env.VITEST_POOL_ID || 0}.db`
const databasePath = path.join(process.cwd(), databaseFile)

// Set the database URL for the libSQL client
process.env.DATABASE_URL = `file:${databasePath}`

beforeEach(async () => {
	await fsExtra.copyFile(BASE_DATABASE_PATH, databasePath)
})

afterAll(async () => {
	// Import db dynamically to ensure environment variables are set first
	const { db } = await import('#app/db')

	// Close the connection pool
	const client = db.$client
	if (client) {
		await client.execute('PRAGMA optimize')
		await client.close()
	}

	await fsExtra.remove(databasePath)
})
