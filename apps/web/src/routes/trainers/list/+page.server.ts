import type { PageServerLoad } from './$types';
import { treaty } from '@elysiajs/eden';
import type { App } from '../../../../../api/src/index';

const api = treaty<App>('http://localhost:3000');

export const load: PageServerLoad = async () => {
    const { data, error } = await api.trainers.get();

    if (error) {
        throw new Error('Failed to load trainers');
    }

    return { trainers: data };
};