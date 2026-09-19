import type { PageServerLoad } from './$types';
import { treaty } from '@elysiajs/eden';
import type { App } from '../../../../../api/src/index';

const API_URL = 'http://localhost:3000';
const api = treaty<App>(API_URL);

export const load: PageServerLoad = async () => {
	const { data: worlds, error } = await api.worlds.get();

	if (error) {
		throw new Error('Failed to load worlds');
	}

	return {
		worlds: (worlds ?? []).map((world) => ({
			...world,
			imageUrl: world.imageUrl ? API_URL + world.imageUrl : null
		}))
	};
};
