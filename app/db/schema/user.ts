import { createId } from '@paralleldrive/cuid2'
import { sql, relations } from 'drizzle-orm'
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core'
import { connections } from './connection.ts'
import { notes } from './note.ts'
import { passwords } from './password.ts'
import { userRoles } from './role.ts'
import { sessions } from './session.ts'
import { userImages } from './user-image.ts'

export const users = sqliteTable('users', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	email: text('email').unique().notNull(),
	username: text('username').unique().notNull(),
	name: text('name'),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(current_timestamp)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(current_timestamp)`),
})

export const usersRelations = relations(users, ({ many, one }) => ({
	notes: many(notes),
	sessions: many(sessions),
	connections: many(connections),
	userRoles: many(userRoles), // Changed from roles to userRoles
	image: one(userImages),
	password: one(passwords),
}))
