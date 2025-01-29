import { createId } from '@paralleldrive/cuid2'
import { sql, relations } from 'drizzle-orm'
import { text, integer, blob, sqliteTable } from 'drizzle-orm/sqlite-core'
import { users } from './user.ts'

export const userImages = sqliteTable('user_images', {
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
	userId: text('user_id')
		.unique()
		.notNull()
		.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
})

export const userImagesRelations = relations(userImages, ({ one }) => ({
	user: one(users, {
		fields: [userImages.userId],
		references: [users.id],
	}),
}))
