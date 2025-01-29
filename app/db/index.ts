import * as dotenv from 'dotenv'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

// Load environment variables from .env file
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

// Create Drizzle instance with logging
export const db = drizzle(client, {
	schema,
	logger: true,
})

// Export schema for use in other files
export * from './schema'
