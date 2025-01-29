import { faker } from '@faker-js/faker'
import { createId } from '@paralleldrive/cuid2'
import { db } from '#app/db'
import { users, roles, userRoles, notes, passwords } from '#app/db/schema'
import { createPassword, createUser } from '#tests/db-utils.ts'

async function main() {
	console.log('🌱 Starting seed...')
	console.time('🌱 Database has been seeded')

	try {
		// 1. Insert roles
		console.log('Creating roles...')
		const createdRoles = await db
			.insert(roles)
			.values([
				{ id: createId(), name: 'admin', description: 'Administrator' },
				{ id: createId(), name: 'user', description: 'Regular user' },
			])
			.returning()
			.execute()

		if (createdRoles.length !== 2) {
			throw new Error('Failed to create both roles')
		}

		const adminRole = createdRoles.find((role) => role.name === 'admin')
		const userRole = createdRoles.find((role) => role.name === 'user')

		if (!adminRole || !userRole) {
			throw new Error('Failed to retrieve created roles')
		}

		// 2. Create users including Kody
		console.log('Creating users...')
		const userPromises = []
		// Regular users
		for (let i = 0; i < 5; i++) {
			const userData = createUser()
			userPromises.push(
				db
					.insert(users)
					.values({
						id: createId(),
						...userData,
					})
					.returning()
					.execute(),
			)
		}

		// Add Kody
		const kodyId = createId()
		userPromises.push(
			db
				.insert(users)
				.values({
					id: kodyId,
					email: 'kody@kcd.dev',
					username: 'kody',
					name: 'Kody',
				})
				.returning()
				.execute(),
		)

		const createdUsers = await Promise.all(userPromises)
		const flatUsers = createdUsers.flat()

		// 3. Create passwords
		console.log('Creating passwords...')
		const passwordPromises = flatUsers.map((user) =>
			db
				.insert(passwords)
				.values({
					hash: createPassword(user.username).hash,
					userId: user.id,
				})
				.execute(),
		)
		await Promise.all(passwordPromises)

		// 4. Assign roles
		console.log('Assigning roles...')
		// Give all users the user role
		const userRolePromises = flatUsers.map((user) =>
			db
				.insert(userRoles)
				.values({
					userId: user.id,
					roleId: userRole.id,
				})
				.execute(),
		)
		await Promise.all(userRolePromises)

		// Give Kody admin role
		const kodyUser = flatUsers.find((u) => u.username === 'kody')
		if (kodyUser) {
			await db
				.insert(userRoles)
				.values({
					userId: kodyUser.id,
					roleId: adminRole.id,
				})
				.execute()
		}

		// 5. Create notes
		console.log('Creating notes...')
		for (const user of flatUsers) {
			if (user.username !== 'kody') {
				const notesCount = faker.number.int({ min: 1, max: 3 })
				for (let i = 0; i < notesCount; i++) {
					await db
						.insert(notes)
						.values({
							id: createId(),
							title: faker.lorem.sentence(),
							content: faker.lorem.paragraphs(),
							ownerId: user.id,
						})
						.execute()
				}
			}
		}

		// Add Kody's special note
		if (kodyUser) {
			await db
				.insert(notes)
				.values({
					id: 'd27a197e',
					title: 'Basic Koala Facts',
					content: 'Koalas are found in the eucalyptus forests...',
					ownerId: kodyUser.id,
				})
				.execute()
		}

		// Verify seeding
		console.log('\nVerifying seed data...')
		const totalUsers = await db.query.users.findMany()
		console.log('Total users:', totalUsers.length)
		const totalRoles = await db.query.roles.findMany()
		console.log('Total roles:', totalRoles.length)
		const totalNotes = await db.query.notes.findMany()
		console.log('Total notes:', totalNotes.length)

		console.timeEnd('🌱 Database has been seeded')
	} catch (error) {
		console.error('Error seeding database:', error)
		throw error
	}
}

await main()
	.catch((err) => {
		console.error('Seed failed:', err)
		process.exit(1)
	})
	.then(() => {
		console.log('✅ Seed completed successfully')
		process.exit(0)
	})

// we're ok to import from the test directory in this file
/*
eslint
    no-restricted-imports: "off",
*/
