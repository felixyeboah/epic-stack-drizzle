// app/database/migrate.ts
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from './index'

async function runMigrations() {
	console.log('🔄 Running migrations...')

	try {
		await migrate(db, {
			migrationsFolder: './app/db/migrations',
		})
		console.log('✅ Migrations completed successfully')
	} catch (error) {
		console.error('❌ Error running migrations:', error)
		process.exit(1)
	}

	process.exit(0)
}

runMigrations().catch((err) => {
	console.error('Migration failed:', err)
	process.exit(1)
})
