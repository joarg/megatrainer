import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { treaty } from '@elysiajs/eden';
import type {App} from '../../../../../../api/src/index'

const api = treaty<App>('http://localhost:3000');

export const load: PageServerLoad = async ({ params, url }) => {
	const meeting = url.searchParams.get('meeting');
	const sessionId = Number(meeting);
	const claimToken = url.searchParams.get('claimToken');

	if (!meeting || !Number.isInteger(sessionId) || sessionId <= 0) {
		throw error(400, 'Missing or invalid meeting query parameter');
	}

	if (!claimToken) {
		throw error(400, 'Missing claimToken query parameter');
	}

	// There's no endpoint to fetch an onboarding session by id in this API, so we
	// can't re-hydrate session state (phase/profile/history) here. We only load the
	// trainer (for name/personality display); the conversation itself is carried
	// over via navigation state from the page that created the session, and is kept
	// entirely client-side afterwards through /onboarding/message responses.
	const { data: trainer, error: apiError } = await api.trainers({ slug: params.slug }).get();

	if (apiError) {
		const value = apiError.value as { message?: string } | undefined;
		throw error(apiError.status ?? 404, value?.message ?? 'Trainer not found');
	}

	return {
		trainer,
		slug: params.slug,
		sessionId,
		claimToken,
	};
};
