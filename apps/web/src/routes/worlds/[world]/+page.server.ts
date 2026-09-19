import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { treaty } from '@elysiajs/eden';
import type { App } from '../../../../../api/src/index';

const API_URL = 'http://localhost:3000';
const api = treaty<App>(API_URL);

export const load: PageServerLoad = async ({ params }) => {
	const { data: world, error: worldError } = await api.worlds({ slug: params.world }).get();

	if (worldError || !world || 'error' in world) {
		throw error(worldError?.status ?? 404, 'Unknown world');
	}

	const { data: allTrainers, error: apiError } = await api.trainers.get();

	if (apiError) {
		throw error(500, 'Failed to load trainers');
	}

	const trainers = (allTrainers ?? [])
		.filter((trainer) => trainer.worldId === world.id)
		.map((trainer) => ({
			slug: trainer.slug,
			name: trainer.name,
			sports: trainer.sports,
			tagline: trainer.tagline ?? '',
			imageKey: trainer.slug,
			// The action shot doubles as the world-grid cover image (it's the
			// more dynamic/inspirational of the two generated pictures);
			// falls back to the portrait, then to a static/placeholder image.
			imageUrl: trainer.actionShotUrl
				? API_URL + trainer.actionShotUrl
				: trainer.portraitUrl
					? API_URL + trainer.portraitUrl
					: null
		}));

	return {
		world: { ...world, imageUrl: world.imageUrl ? API_URL + world.imageUrl : null },
		trainers
	};
};
