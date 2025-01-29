import { createId } from '@paralleldrive/cuid2'
import { sql, relations } from 'drizzle-orm'
import { text, integer, sqliteTable, unique } from 'drizzle-orm/sqlite-core'
import { users } from './user.ts'

export const connections = sqliteTable(
	'connections',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		providerName: text('provider_name').notNull(),
		providerId: text('provider_id').notNull(),
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
		uniqueProviderNameId: unique('connections_provider_name_id').on(
			table.providerName,
			table.providerId,
		),
	}),
)

export const connectionsRelations = relations(connections, ({ one }) => ({
	user: one(users, {
		fields: [connections.userId],
		references: [users.id],
	}),
}))
