import { type SEOHandle } from '@nasa-gcn/remix-seo'
import { useFetcher } from 'react-router'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireRecentVerification } from '#app/routes/_auth+/verify.server.ts'
import { requireUserId } from '#app/utils/auth.server.ts'
import { useDoubleCheck } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/profile.two-factor.disable.ts'
import { type BreadcrumbHandle } from './profile.tsx'
import { twoFAVerificationType } from './profile.two-factor.tsx'
import {db, verifications} from "#app/db";
import {and, eq} from "drizzle-orm";

export const handle: BreadcrumbHandle & SEOHandle = {
	breadcrumb: <Icon name="lock-open-1">Disable</Icon>,
	getSitemapEntries: () => null,
}

export async function loader({ request }: Route.LoaderArgs) {
	await requireRecentVerification(request)
	return {}
}

export async function action({ request }: Route.ActionArgs) {
	await requireRecentVerification(request)
	const userId = await requireUserId(request)

	await db
		.delete(verifications)
		.where(
			and(
				eq(verifications.type, twoFAVerificationType),
				eq(verifications.target, userId),
			),
		)

	return redirectWithToast('/settings/profile/two-factor', {
		title: '2FA Disabled',
		description: 'Two factor authentication has been disabled.',
	})
}

export default function TwoFactorDisableRoute() {
	const disable2FAFetcher = useFetcher<typeof action>()
	const dc = useDoubleCheck()

	return (
		<div className="mx-auto max-w-sm">
			<disable2FAFetcher.Form method="POST">
				<p>
					Disabling two factor authentication is not recommended. However, if
					you would like to do so, click here:
				</p>
				<StatusButton
					variant="destructive"
					status={disable2FAFetcher.state === 'loading' ? 'pending' : 'idle'}
					{...dc.getButtonProps({
						className: 'mx-auto',
						name: 'intent',
						value: 'disable',
						type: 'submit',
					})}
				>
					{dc.doubleCheck ? 'Are you sure?' : 'Disable 2FA'}
				</StatusButton>
			</disable2FAFetcher.Form>
		</div>
	)
}
