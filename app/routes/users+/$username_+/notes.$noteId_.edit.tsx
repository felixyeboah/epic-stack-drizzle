import { invariantResponse } from '@epic-web/invariant'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { type Route } from './+types/notes.$noteId_.edit.ts'
import { NoteEditor } from './__note-editor.tsx'
import {db, notes} from "#app/db";
import {and, eq} from "drizzle-orm";

export { action } from './__note-editor.server.tsx'

export async function loader({ params, request }: Route.LoaderArgs) {
	const { noteId } = params
	invariantResponse(noteId, 'Note ID is required')

	const userId = await requireUserId(request)

	const note = await db.query.notes.findFirst({
		where: and(eq(notes.id, noteId), eq(notes.ownerId, userId)),
		with: {
			images: {
				columns: {
					id: true,
					altText: true,
				},
			},
		},
		columns: {
			id: true,
			title: true,
			content: true,
		},
	})

	invariantResponse(note, 'Not found', { status: 404 })
	return { note }
}

export default function NoteEdit({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	return <NoteEditor note={loaderData.note} actionData={actionData} />
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No note with the id "{params.noteId}" exists</p>
				),
			}}
		/>
	)
}
