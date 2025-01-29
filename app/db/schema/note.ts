import { createId } from '@paralleldrive/cuid2'
import { sql, relations, InferSelectModel } from 'drizzle-orm'
import { text, integer, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import { noteImages } from './note-image.ts'
import { users } from './user.ts'
import { timestamp } from 'drizzle-orm/mysql-core'

export const notes = sqliteTable(
	'notes',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		title: text('title').notNull(),
		content: text('content').notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		ownerId: text('owner_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	},
	(table) => ({
		ownerIdIdx: index('notes_owner_id_idx').on(table.ownerId),
		ownerIdUpdatedAtIdx: index('notes_owner_id_updated_at_idx').on(
			table.ownerId,
			table.updatedAt,
		),
	}),
)

export const notesRelations = relations(notes, ({ one, many }) => ({
	owner: one(users, {
		fields: [notes.ownerId],
		references: [users.id],
	}),
	images: many(noteImages),
}))

export type Note = InferSelectModel<typeof notes>
export type NoteImage = InferSelectModel<typeof noteImages>
