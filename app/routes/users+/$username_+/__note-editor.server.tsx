import { parseWithZod } from '@conform-to/zod'
import { type FileUpload, parseFormData } from '@mjackson/form-data-parser'
import { createId as cuid } from '@paralleldrive/cuid2'
import { data, redirect, type ActionFunctionArgs } from 'react-router'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'
import { uploadHandler } from '#app/utils/file-uploads.server.ts'
import {
	MAX_UPLOAD_SIZE,
	NoteEditorSchema,
	type ImageFieldset,
} from './__note-editor'
import {db, noteImages, notes, users} from "#app/db";
import {and, eq} from "drizzle-orm";
import {invariantResponse} from "@epic-web/invariant";

function imageHasFile(
	image: ImageFieldset,
): image is ImageFieldset & { file: NonNullable<ImageFieldset['file']> } {
	return Boolean(image.file?.size && image.file?.size > 0)
}

function imageHasId(
	image: ImageFieldset,
): image is ImageFieldset & { id: NonNullable<ImageFieldset['id']> } {
	return image.id != null
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)

	const formData = await parseFormData(
		request,
		async (file: FileUpload) => uploadHandler(file),
		{ maxFileSize: MAX_UPLOAD_SIZE },
	)

	const submission = await parseWithZod(formData, {
		schema: NoteEditorSchema.superRefine(async (data, ctx) => {
			if (!data.id) return

			const note = await db.query.notes.findFirst({
				where: and(eq(notes.id, data.id), eq(notes.ownerId, userId)),
				columns: { id: true },
			})

			if (!note) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Note not found',
				})
			}
		}).transform(async ({ images = [], ...data }) => {
			return {
				...data,
				imageUpdates: await Promise.all(
					images.filter(imageHasId).map(async (i) => {
						if (imageHasFile(i)) {
							return {
								id: i.id,
								altText: i.altText,
								contentType: i.file.type,
								blob: Buffer.from(await i.file.arrayBuffer()),
							}
						} else {
							return {
								id: i.id,
								altText: i.altText,
							}
						}
					}),
				),
				newImages: await Promise.all(
					images
						.filter(imageHasFile)
						.filter((i) => !i.id)
						.map(async (image) => {
							return {
								altText: image.altText,
								contentType: image.file.type,
								blob: Buffer.from(await image.file.arrayBuffer()),
							}
						}),
				),
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const {
		id: noteId,
		title,
		content,
		imageUpdates = [],
		newImages = [],
	} = submission.value

	const [newNote] = await db
		.insert(notes)
		.values({
			id: cuid(),
			ownerId: userId,
			title,
			content,
		})
		.returning({
			id: notes.id,
		})

	invariantResponse(newNote, 'Failed to create note')

	// Then create any new images
	if (newImages.length) {
		await db.insert(noteImages).values(
			newImages.map((image) => ({
				id: cuid(),
				noteId: newNote.id,
				...image,
			})),
		)
	}

	const owner = await db.query.users.findFirst({
		where: eq(users.id, userId),
		columns: { username: true, id: true },
	})

	invariantResponse(owner, 'Owner not found')

	return redirect(
		`/users/${owner.username}/notes/${owner.id}`,
	)
}
