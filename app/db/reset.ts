// app/database/reset.ts
import * as dotenv from 'dotenv'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

// Load environment variables
dotenv.config()

if (!process.env.DATABASE_URL || !process.env.DATABASE_AUTH_TOKEN) {
	throw new Error(
		'Database configuration not found. Please ensure DATABASE_URL and DATABASE_AUTH_TOKEN are set in your .env file.',
	)
}

// Initialize Turso client
const client = createClient({
	url: process.env.DATABASE_URL,
	authToken: process.env.DATABASE_AUTH_TOKEN,
})

// Create Drizzle instance
const db = drizzle(client, { schema })

async function reset() {
	console.log('🗑️ Resetting database...')
	console.time('🗑️ Database has been reset')

	try {
		// Drop tables in reverse order to handle foreign key constraints
		await db.run(sql`DROP TABLE IF EXISTS verifications;`)
		await db.run(sql`DROP TABLE IF EXISTS note_images;`)
		await db.run(sql`DROP TABLE IF EXISTS notes;`)
		await db.run(sql`DROP TABLE IF EXISTS user_images;`)
		await db.run(sql`DROP TABLE IF EXISTS sessions;`)
		await db.run(sql`DROP TABLE IF EXISTS connections;`)
		await db.run(sql`DROP TABLE IF EXISTS passwords;`)
		await db.run(sql`DROP TABLE IF EXISTS role_permissions;`)
		await db.run(sql`DROP TABLE IF EXISTS permissions;`)
		await db.run(sql`DROP TABLE IF EXISTS user_roles;`)
		await db.run(sql`DROP TABLE IF EXISTS roles;`)
		await db.run(sql`DROP TABLE IF EXISTS users;`)

		console.timeEnd('🗑️ Database has been reset')
	} catch (error) {
		console.error('Error resetting database:', error)
		throw error
	}
}

async function main() {
	try {
		await reset()
		process.exit(0)
	} catch (error) {
		console.error(error)
		process.exit(1)
	}
}

void main()
