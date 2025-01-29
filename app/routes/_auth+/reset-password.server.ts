import { invariant } from '@epic-web/invariant'
import { data, redirect } from 'react-router'
import { verifySessionStorage } from '#app/utils/verification.server.ts'
import { resetPasswordUsernameSessionKey } from './reset-password.tsx'
import { type VerifyFunctionArgs } from './verify.server.ts'
import {db, users} from "#app/db";
import {eq, or} from "drizzle-orm";

export async function handleVerification({ submission }: VerifyFunctionArgs) {
	invariant(
		submission.status === 'success',
		'Submission should be successful by now',
	)
	const target = submission.value.target

	const [user] = await db
		.select({
			email: users.email,
			username: users.username,
		})
		.from(users)
		.where(or(eq(users.email, target), eq(users.username, target)))
		.limit(1)
	// we don't want to say the user is not found if the email is not found
	// because that would allow an attacker to check if an email is registered
	if (!user) {
		return data(
			{ result: submission.reply({ fieldErrors: { code: ['Invalid code'] } }) },
			{ status: 400 },
		)
	}

	const verifySession = await verifySessionStorage.getSession()
	verifySession.set(resetPasswordUsernameSessionKey, user.username)
	return redirect('/reset-password', {
		headers: {
			'set-cookie': await verifySessionStorage.commitSession(verifySession),
		},
	})
}
