import { createId } from '@paralleldrive/cuid2'
import { sql, relations } from 'drizzle-orm'
import {
	text,
	integer,
	sqliteTable,
	unique,
	primaryKey,
} from 'drizzle-orm/sqlite-core'
import { roles } from './role.ts'

export const permissions = sqliteTable(
	'permissions',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => createId()),
		action: text('action').notNull(),
		entity: text('entity').notNull(),
		access: text('access').notNull(),
		description: text('description').default(''),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(current_timestamp)`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(current_timestamp)`),
	},
	(table) => ({
		uniqueActionEntityAccess: unique('permissions_action_entity_access').on(
			table.action,
			table.entity,
			table.access,
		),
	}),
)

// Junction table for roles and permissions
export const rolePermissions = sqliteTable(
	'role_permissions',
	{
		roleId: text('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
		permissionId: text('permission_id')
			.notNull()
			.references(() => permissions.id, {
				onDelete: 'cascade',
				onUpdate: 'cascade',
			}),
	},
	(table) => ({
		pk: primaryKey(table.roleId, table.permissionId),
	}),
)

// Relations for the permissions table
export const permissionsRelations = relations(permissions, ({ many }) => ({
	rolePermissions: many(rolePermissions),
}))

// Relations for the rolePermissions junction table
export const rolePermissionsRelations = relations(
	rolePermissions,
	({ one }) => ({
		role: one(roles, {
			fields: [rolePermissions.roleId],
			references: [roles.id],
		}),
		permission: one(permissions, {
			fields: [rolePermissions.permissionId],
			references: [permissions.id],
		}),
	}),
)
