/**
 * @vitest-environment jsdom
 */
import { faker } from '@faker-js/faker'
import { render, screen } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import setCookieParser from 'set-cookie-parser'
import { test } from 'vitest'
import { loader as rootLoader } from '#app/root.tsx'
import { getSessionExpirationDate, sessionKey } from '#app/utils/auth.server.ts'
import { authSessionStorage } from '#app/utils/session.server.ts'
import { createUser, getUserImages } from '#tests/db-utils.ts'
import { default as UsernameRoute, loader } from './$username.tsx'
import {db, sessions, userImages, users} from "#app/db";
import {createId} from "@paralleldrive/cuid2";

test('The user profile when not logged in as self', async () => {
	const images = await getUserImages()
	const randomImage =
		images[faker.number.int({ min: 0, max: images.length - 1 })]

	if (!randomImage) {
		throw new Error('Failed to get user image')
	}
	// Create user first
	const [user] = await db.insert(users).values(createUser()).returning({
		id: users.id,
		username: users.username,
		name: users.name,
	})

	if (!user) {
		throw new Error('Failed to create user')
	}

	// Create user image
	await db.insert(userImages).values({
		contentType: randomImage.contentType,
		blob: randomImage.blob,
		altText: randomImage.altText,
		userId: user.id,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

	const App = createRoutesStub([
		{
			path: '/users/:username',
			Component: UsernameRoute,
			loader,
		},
	])

	const routeUrl = `/users/${user.username}`
	render(<App initialEntries={[routeUrl]} />)

	await screen.findByRole('heading', { level: 1, name: user.name! })
	await screen.findByRole('img', { name: user.name! })
	await screen.findByRole('link', { name: `${user.name}'s notes` })
})

test('The user profile when logged in as self', async () => {
	const images = await getUserImages()
	const randomImage =
		images[faker.number.int({ min: 0, max: images.length - 1 })]

	if (!randomImage) {
		throw new Error('Failed to get user image')
	}

	// Create user first
	const [user] = await db.insert(users).values(createUser()).returning({
		id: users.id,
		username: users.username,
		name: users.name,
	})

	if (!user) {
		throw new Error('Failed to create user')
	}

// Create user image
	await db.insert(userImages).values({
		contentType: randomImage.contentType,
		blob: randomImage.blob,
		altText: randomImage.altText,
		userId: user.id,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	});

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

	if (!session) {
		throw new Error('Failed to create session')
	}

	const authSession = await authSessionStorage.getSession()
	authSession.set(sessionKey, session.id)
	const setCookieHeader = await authSessionStorage.commitSession(authSession)
	const parsedCookie = setCookieParser.parseString(setCookieHeader)
	const cookieHeader = new URLSearchParams({
		[parsedCookie.name]: parsedCookie.value,
	}).toString()

	const App = createRoutesStub([
		{
			id: 'root',
			path: '/',
			loader: async (args) => {
				// add the cookie header to the request
				args.request.headers.set('cookie', cookieHeader)
				return rootLoader({ ...args, context: args.context })
			},
			children: [
				{
					path: 'users/:username',
					Component: UsernameRoute,
					loader: async (args) => {
						// add the cookie header to the request
						args.request.headers.set('cookie', cookieHeader)
						return loader(args)
					},
				},
			],
		},
	])

	const routeUrl = `/users/${user.username}`
	await render(<App initialEntries={[routeUrl]} />)

	await screen.findByRole('heading', { level: 1, name: user.name! })
	await screen.findByRole('img', { name: user.name! })
	await screen.findByRole('button', { name: /logout/i })
	await screen.findByRole('link', { name: /my notes/i })
	await screen.findByRole('link', { name: /edit profile/i })
})
