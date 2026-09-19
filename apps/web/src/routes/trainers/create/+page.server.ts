import type { PageServerLoad } from './$types';
import { treaty } from '@elysiajs/eden';
import type { App } from '../../../../../api/src/index';

const api = treaty<App>('http://localhost:3000');

export const load: PageServerLoad = async () => {
	const { data: worlds, error } = await api.worlds.get();

	if (error) {
		return { worlds: [] };
	}

	return { worlds: worlds ?? [] };
};
