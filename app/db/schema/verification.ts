import { createId } from '@paralleldrive/cuid2'
import { sql } from 'drizzle-orm'
import { text, integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core'

export const verifications = sqliteTable(
	'verifications',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		type: text('type').notNull(),
		target: text('target').notNull(),
		secret: text('secret').notNull(),
		algorithm: text('algorithm').notNull(),
		digits: integer('digits').notNull(),
		period: integer('period').notNull(),
		charSet: text('char_set').notNull(),
		expiresAt: integer('expires_at', { mode: 'timestamp' }),
	},
	(table) => ({
		uniqueTargetType: unique('verifications_target_type').on(
			table.target,
			table.type,
		),
	}),
)
