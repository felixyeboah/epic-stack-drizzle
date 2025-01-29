import { requireUserId } from '#app/utils/auth.server.ts'
import { getDomainUrl } from '#app/utils/misc.tsx'
import { type Route } from './+types/download-user-data.ts'
import {db, users} from "#app/db";
import {invariantResponse} from "@epic-web/invariant";
import {eq} from "drizzle-orm";

export async function loader({ request }: Route.LoaderArgs) {
	const userId = await requireUserId(request)

	const user = await db.query.users.findFirst({
		where: eq(users.id, userId),
		with: {
			image: {
				columns: {
					id: true,
					createdAt: true,
					updatedAt: true,
					contentType: true,
					blob: false, // Exclude blob data
				},
			},
			notes: {
				with: {
					images: {
						columns: {
							id: true,
							createdAt: true,
							updatedAt: true,
							contentType: true,
							blob: false, // Exclude blob data
						},
					},
				},
			},
			sessions: true,
			userRoles: {
				with: {
					role: true,
				},
			},
		},
	})

	invariantResponse(user, 'User not found', { status: 404 })

	const domain = getDomainUrl(request)

	return Response.json({
		user: {
			...user,
			image: user.image
				? {
						...user.image,
						url: `${domain}/resources/user-images/${user.image.id}`,
					}
				: null,
			notes: user.notes.map((note) => ({
				...note,
				images: note.images.map((image) => ({
					...image,
					url: `${domain}/resources/note-images/${image.id}`,
				})),
			})),
		},
	})
}
