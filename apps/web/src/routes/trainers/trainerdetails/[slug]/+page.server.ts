import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { treaty } from '@elysiajs/eden';
import type { App } from '../../../../../../api/src/index';

const api = treaty<App>('http://localhost:3000');

export const load: PageServerLoad = async ({ params }) => {
  const { data, error: apiError } = await api.trainers({ slug: params.slug }).get();

  if (apiError) {
    const value = apiError.value as { message?: string } | undefined;
    throw error(apiError.status ?? 404, value?.message ?? 'Trainer not found');
  }

  return { trainer: data };
};