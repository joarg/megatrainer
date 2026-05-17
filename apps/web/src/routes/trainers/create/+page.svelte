

<script lang="ts">
import { treaty } from '@elysiajs/eden';
import { goto } from '$app/navigation';
import type { App } from '../../../../../api/src/index';

const api = treaty<App>('http://localhost:3000');

  let name = $state('');
  let personality =$state('');
  let sports = $state('');
  let slug = $state('');
  let status = $state('');

  async function createTrainer() {
    const normalizedSlug = slug.trim();
    const normalizedSports = sports
      .split(',')
      .map((sport) => sport.trim())
      .filter((sport) => sport.length > 0);

    if (normalizedSports.length === 0) {
      status = 'Please add at least one sport';
      return;
    }

    status = 'Creating trainer...';
    const { error } = await api.trainers.post({
      name: name.trim(),
      personality: personality.trim(),
      sports: normalizedSports,
      slug: normalizedSlug,
    });
    if (error) {
      console.error('Failed to create trainer:', error);
      status = 'Failed to create trainer';
      return;
    }
    goto(`/trainers/trainerdetails/${normalizedSlug}`);
  }

</script>

  <input bind:value={name} placeholder="Name" required>
  <input bind:value={personality} placeholder="Personality" required>
  <input bind:value={sports} placeholder="Sports (comma separated)" required>
  <input bind:value={slug} placeholder="Slug" required>
  <button onclick={createTrainer} >Create</button>
  <p>{status}</p>
