import { createId } from '@paralleldrive/cuid2'
import { sql, relations, InferSelectModel } from 'drizzle-orm'
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import { users } from './user.ts'
import { notes } from '#app/db'

export const sessions = sqliteTable(
	'sessions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		expirationDate: integer('expiration_date', { mode: 'timestamp' }).notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	},
	(table) => ({
		userIdIdx: index('sessions_user_id_idx').on(table.userId),
	}),
)

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}))

export type Session = InferSelectModel<typeof sessions>
