import { invariantResponse } from '@epic-web/invariant'
import { type Route } from './+types/note-images.$imageId.ts'
import {db, noteImages} from "#app/db";
import {eq} from "drizzle-orm";

export async function loader({ params }: Route.LoaderArgs) {
	invariantResponse(params.imageId, 'Image ID is required', { status: 400 })

	const image = await db.query.noteImages.findFirst({
		where: eq(noteImages.id, params.imageId),
		columns: {
			contentType: true,
			blob: true,
		},
	})

	invariantResponse(image, 'Not found', { status: 404 })

	return new Response(image.blob, {
		headers: {
			'Content-Type': image.contentType,
			'Content-Length': Buffer.byteLength(image.blob).toString(),
			'Content-Disposition': `inline; filename="${params.imageId}"`,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	})
}
