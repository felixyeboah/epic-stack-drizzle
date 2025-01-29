import { relations } from 'drizzle-orm'
import { text, sqliteTable } from 'drizzle-orm/sqlite-core'
import { users } from './user.ts'

export const passwords = sqliteTable('passwords', {
	hash: text('hash').notNull(),
	userId: text('user_id')
		.unique()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
})

export const passwordsRelations = relations(passwords, ({ one }) => ({
	user: one(users, {
		fields: [passwords.userId],
		references: [users.id],
	}),
}))
