import { createId } from '@paralleldrive/cuid2'
import { sql, relations } from 'drizzle-orm'
import {
	text,
	integer,
	blob,
	sqliteTable,
	index,
} from 'drizzle-orm/sqlite-core'
import { notes } from './note.ts'

export const noteImages = sqliteTable(
	'note_images',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		altText: text('alt_text'),
		contentType: text('content_type').notNull(),
		blob: blob('blob', { mode: 'buffer' }).notNull(),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		noteId: text('note_id')
			.notNull()
			.references(() => notes.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	},
	(table) => ({
		noteIdIdx: index('note_images_note_id_idx').on(table.noteId),
	}),
)

export const noteImagesRelations = relations(noteImages, ({ one }) => ({
	note: one(notes, {
		fields: [noteImages.noteId],
		references: [notes.id],
	}),
}))
