import { data } from 'react-router'
import { requireUserId } from './auth.server.ts'
import { type PermissionString, parsePermissionString } from './user.ts'
import {db, permissions, rolePermissions, roles, userRoles, users} from "#app/db";
import {and, eq, inArray} from "drizzle-orm";

export async function requireUserWithPermission(
	request: Request,
	permission: PermissionString,
) {
	const userId = await requireUserId(request)
	const permissionData = parsePermissionString(permission)

	// Using Drizzle's query builder to check user permissions
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.innerJoin(userRoles, eq(users.id, userRoles.userId))
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
		.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
		.where(
			and(
				eq(users.id, userId),
				eq(permissions.action, permissionData.action),
				eq(permissions.entity, permissionData.entity),
				permissionData.access
					? inArray(permissions.access, permissionData.access)
					: undefined,
			),
		)
		.limit(1)

	if (!user) {
		throw data(
			{
				error: 'Unauthorized',
				requiredPermission: permissionData,
				message: `Unauthorized: required permissions: ${permission}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}

export async function requireUserWithRole(request: Request, name: string) {
	const userId = await requireUserId(request)

	// Using Drizzle's query builder to check user roles
	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.innerJoin(userRoles, eq(users.id, userRoles.userId))
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(and(eq(users.id, userId), eq(roles.name, name)))
		.limit(1)

	if (!user) {
		throw data(
			{
				error: 'Unauthorized',
				requiredRole: name,
				message: `Unauthorized: required role: ${name}`,
			},
			{ status: 403 },
		)
	}
	return user.id
}
