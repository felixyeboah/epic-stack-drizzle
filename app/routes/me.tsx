import {eq} from "drizzle-orm";
import { redirect } from 'react-router'
import {db, users} from "#app/db";
import { requireUserId, logout } from '#app/utils/auth.server.ts'
import { type Route } from './+types/me.ts'

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: {
			username: true,
		},
	})

	if (!user) {
		const requestUrl = new URL(request.url)
		const loginParams = new URLSearchParams([
			['redirectTo', `${requestUrl.pathname}${requestUrl.search}`],
		])
		const redirectTo = `/login?${loginParams}`
		await logout({ request, redirectTo })
		return redirect(redirectTo)
	}
	return redirect(`/users/${user.username}`)
}
