import { type Connection, type Password, type User } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { redirect } from 'react-router'
import { Authenticator } from 'remix-auth'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { connectionSessionStorage, providers } from './connections.server.ts'
import { combineHeaders, downloadFile } from './misc.tsx'
import { type ProviderUser } from './providers/provider.ts'
import { authSessionStorage } from './session.server.ts'
import {connections, db, passwords, sessions, users} from "#app/db";
import {eq} from "drizzle-orm";

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

export const authenticator = new Authenticator<ProviderUser>(
	connectionSessionStorage,
)

for (const [providerName, provider] of Object.entries(providers)) {
	authenticator.use(provider.getAuthStrategy(), providerName)
}

export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	if (!sessionId) return null

	const session = await db.query.sessions.findFirst({
		where: eq(sessions.id, sessionId),
		with: {
			user: {
				columns: {
					id: true,
				},
			},
		},
	})

	if (!session?.user) {
		throw redirect('/', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}
	return session.user.id
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request)
	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo =
			redirectTo === null
				? null
				: (redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`)
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ['/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?')
		throw redirect(loginRedirect)
	}
	return userId
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/')
	}
}

export async function login({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const user = await verifyUserPassword({ username }, password)
	if (!user) return null

	const session = await db
		.insert(sessions)
		.values({
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		})
		.returning({
			id: sessions.id,
			expirationDate: sessions.expirationDate,
			userId: sessions.userId,
		})
		.get()

	return session
}

export async function resetUserPassword({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)

	const user = await db.query.users.findFirst({
		where: eq(users.username, username),
		with: {
			password: true,
		},
	})

	if (!user?.password) return null

	return await db
		.update(passwords)
		.set({ hash: hashedPassword })
		.where(eq(passwords.userId, user.id))
		.returning()
		.get()

}

export async function signup({
	email,
	username,
	password,
	name,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)

	// Create user first
	const user = await db
		.insert(users)
		.values({
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			name,
		})
		.returning()
		.get()

	// Create password
	await db
		.insert(passwords)
		.values({
			hash: hashedPassword,
			userId: user.id,
		})
		.execute()

	// Create session
	const session = await db
		.insert(sessions)
		.values({
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		})
		.returning({
			id: sessions.id,
			expirationDate: sessions.expirationDate,
		})
		.get()

	return session
}

export async function signupWithConnection({
	email,
	username,
	name,
	providerId,
	providerName,
	imageUrl,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	providerId: Connection['providerId']
	providerName: Connection['providerName']
	imageUrl?: string
}) {
	// Create user first
	const user = await db
		.insert(users)
		.values({
			email: email.toLowerCase(),
			username: username.toLowerCase(),
			name,
		})
		.returning()
		.get()

	// Create connection
	await db
		.insert(connections)
		.values({
			providerId,
			providerName,
			userId: user.id,
		})
		.execute()

	// Create session
	const session = await db
		.insert(sessions)
		.values({
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		})
		.returning({
			id: sessions.id,
			expirationDate: sessions.expirationDate,
		})
		.get()

	return session
}

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	// if this fails, we still need to delete the session from the user's browser
	// and it doesn't do any harm staying in the db anyway.
	if (sessionId) {
		// the .catch is important because that's what triggers the query.
		// learn more about PrismaPromise: https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismapromise-behavior
		await db.delete(sessions).where(eq(sessions.id, sessionId)).execute()
	}
	throw redirect(safeRedirect(redirectTo), {
		...responseInit,
		headers: combineHeaders(
			{ 'set-cookie': await authSessionStorage.destroySession(authSession) },
			responseInit?.headers,
		),
	})
}

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'username'> | Pick<User, 'id'>,
	password: Password['hash'],
) {
	const userWithPassword = await db.query.users.findFirst({
		where:
			'username' in where
				? eq(users.username, where.username)
				: eq(users.id, where.id),
		with: {
			password: {
				columns: {
					hash: true,
				},
			},
		},
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	if (!isValid) {
		return null
	}

	return { id: userWithPassword.id }
}
