import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { treaty } from '@elysiajs/eden';
import type {App} from '../../../../../../api/src/index'

const api = treaty<App>('http://localhost:3000');

export const load: PageServerLoad = async ({ params, url }) => {
	const meeting = url.searchParams.get('meeting');
	const sessionId = Number(meeting);

	if (!meeting || !Number.isInteger(sessionId) || sessionId <= 0) {
		throw error(400, 'Missing or invalid meeting query parameter');
	}

	const { data, error: apiError } = await api
		.trainers({ slug: params.slug })
		.onboarding.session({ sessionId })
		.get();

	if (apiError) {
		const value = apiError.value as { message?: string } | undefined;
		throw error(apiError.status ?? 404, value?.message ?? 'Session not found');
	}

	return {
		session: data,
		slug: params.slug,
	};
};
