import { createId } from '@paralleldrive/cuid2'
import { sql, relations } from 'drizzle-orm'
import { text, integer, sqliteTable, primaryKey } from 'drizzle-orm/sqlite-core'
import { rolePermissions } from './permission.ts'
import { users } from './user.ts'

export const roles = sqliteTable('roles', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => createId()),
	name: text('name').unique().notNull(),
	description: text('description').default(''),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(current_timestamp)`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(current_timestamp)`),
})

export const userRoles = sqliteTable(
	'user_roles',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		roleId: text('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
	},
	(table) => ({
		pk: primaryKey(table.userId, table.roleId),
	}),
)

// Updated roles relations to include both userRoles and rolePermissions
export const rolesRelations = relations(roles, ({ many }) => ({
	userRoles: many(userRoles),
	rolePermissions: many(rolePermissions),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id],
	}),
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id],
	}),
}))
