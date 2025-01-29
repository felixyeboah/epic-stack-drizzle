import { test as base } from '@playwright/test'
import { type User as UserModel } from '@prisma/client'
import * as setCookieParser from 'set-cookie-parser'
import {
	getPasswordHash,
	getSessionExpirationDate,
	sessionKey,
} from '#app/utils/auth.server.ts'
import { MOCK_CODE_GITHUB_HEADER } from '#app/utils/providers/constants.js'
import { normalizeEmail } from '#app/utils/providers/provider.js'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createUser } from './db-utils.ts'
import {
	type GitHubUser,
	deleteGitHubUser,
	insertGitHubUser,
} from './mocks/github.ts'
import {db, passwords, roles, sessions, userRoles, users} from '#app/db/index.ts'
import {eq} from "drizzle-orm";

export * from './db-utils.ts'

type GetOrInsertUserOptions = {
	id?: string
	username?: UserModel['username']
	password?: string
	email?: UserModel['email']
}

type User = {
	id: string
	email: string
	username: string
	name: string | null
}

async function getOrInsertUser({
	id,
	username,
	password,
	email,
}: GetOrInsertUserOptions = {}): Promise<User> {
	const select = { id: true, email: true, username: true, name: true }
	if (id) {
		const [user] = await db
			.select({
				id: users.id,
				email: users.email,
				username: users.username,
				name: users.name,
			})
			.from(users)
			.where(eq(users.id, id))
			.limit(1)

		if (!user) throw new Error('User not found')
		return user
	} else {
		const userData = createUser()
		username ??= userData.username
		password ??= userData.username
		email ??= userData.email
		// Get the user role
		const [userRole] = await db
			.select({
				id: roles.id,
			})
			.from(roles)
			.where(eq(roles.name, 'user'))
			.limit(1)

		// Create user
		const [user] = await db
			.insert(users)
			.values({
				...userData,
				email,
				username,
			})
			.returning({
				id: users.id,
				email: users.email,
				username: users.username,
				name: users.name,
			})

		if (!user) throw new Error('User not found')
		if (!userRole) throw new Error('User role not found')

		// Create password
		await db.insert(passwords).values({
			hash: await getPasswordHash(password),
			userId: user.id,
		})

		// Assign role
		await db.insert(userRoles).values({
			userId: user.id,
			roleId: userRole.id,
		})

		return user
	}
}

export const test = base.extend<{
	insertNewUser(options?: GetOrInsertUserOptions): Promise<User>
	login(options?: GetOrInsertUserOptions): Promise<User>
	prepareGitHubUser(): Promise<GitHubUser>
}>({
	insertNewUser: async ({}, use) => {
		let userId: string | undefined = undefined
		await use(async (options) => {
			const user = await getOrInsertUser(options)
			userId = user.id
			return user
		})
		if (userId) {
			await db
				.delete(users)
				.where(eq(users.id, userId))
				.catch(() => {})
		}
	},
	login: async ({ page }, use) => {
		let userId: string | undefined = undefined
		await use(async (options) => {
			const user = await getOrInsertUser(options)
			userId = user.id

			// Create session
			const [session] = await db
				.insert(sessions)
				.values({
					expirationDate: getSessionExpirationDate(),
					userId: user.id,
				})
				.returning({
					id: sessions.id,
				})

			if (!session) throw new Error('Session not found')

			const authSession = await authSessionStorage.getSession()
			authSession.set(sessionKey, session.id)
			const cookieConfig = setCookieParser.parseString(
				await authSessionStorage.commitSession(authSession),
			)
			const newConfig = {
				...cookieConfig,
				domain: 'localhost',
				expires: cookieConfig.expires?.getTime(),
				sameSite: cookieConfig.sameSite as 'Strict' | 'Lax' | 'None',
			}
			await page.context().addCookies([newConfig])
			return user
		})
		if (userId) {
			await db.delete(users).where(eq(users.id, userId))
		}
	},
	prepareGitHubUser: async ({ page }, use, testInfo) => {
		await page.route(/\/auth\/github(?!\/callback)/, async (route, request) => {
			const headers = {
				...request.headers(),
				[MOCK_CODE_GITHUB_HEADER]: testInfo.testId,
			}
			await route.continue({ headers })
		})

		let ghUser: GitHubUser | null = null
		await use(async () => {
			const newGitHubUser = await insertGitHubUser(testInfo.testId)!
			ghUser = newGitHubUser
			return newGitHubUser
		})

		const [user] = await db
			.select({
				id: users.id,
				name: users.name,
			})
			.from(users)
			.where(eq(users.email, normalizeEmail(ghUser!.primaryEmail)))
			.limit(1)

		if (!user) throw new Error('User not found')

		await db.delete(sessions).where(eq(sessions.userId, user.id))
		await db.delete(users).where(eq(users.id, user.id))
		await deleteGitHubUser(ghUser!.primaryEmail)
	},
})
export const { expect } = test

/**
 * This allows you to wait for something (like an email to be available).
 *
 * It calls the callback every 50ms until it returns a value (and does not throw
 * an error). After the timeout, it will throw the last error that was thrown or
 * throw the error message provided as a fallback
 */
export async function waitFor<ReturnValue>(
	cb: () => ReturnValue | Promise<ReturnValue>,
	{
		errorMessage,
		timeout = 5000,
	}: { errorMessage?: string; timeout?: number } = {},
) {
	const endTime = Date.now() + timeout
	let lastError: unknown = new Error(errorMessage)
	while (Date.now() < endTime) {
		try {
			const response = await cb()
			if (response) return response
		} catch (e: unknown) {
			lastError = e
		}
		await new Promise((r) => setTimeout(r, 100))
	}
	throw lastError
}
