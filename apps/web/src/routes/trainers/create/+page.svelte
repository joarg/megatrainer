

<script lang="ts">
import { treaty } from '@elysiajs/eden';
import { goto } from '$app/navigation';
import type { App } from '../../../../../api/src/index';

const api = treaty<App>('http://localhost:3000');

let { data } = $props();

  let name = $state('');
  let personality =$state('');
  let sports = $state('');
  let slug = $state('');
  let worldId = $state('');
  let tagline = $state('');
  let language = $state('');
  let portraitPrompt = $state('');
  let actionShotPrompt = $state('');
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

    if (!worldId) {
      status = 'Please choose a world';
      return;
    }

    status = 'Creating trainer...';
    const { error } = await api.trainers.post({
      name: name.trim(),
      personality: personality.trim(),
      sports: normalizedSports,
      slug: normalizedSlug,
      worldId: Number(worldId),
      tagline: tagline.trim(),
      language: language.trim(),
      portraitPrompt: portraitPrompt.trim(),
      actionShotPrompt: actionShotPrompt.trim(),
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
  <input bind:value={tagline} placeholder="Tagline (short specialty line)" required>
  <input bind:value={language} placeholder="Language the trainer speaks (e.g. Norwegian) — leave blank for English">

  <select bind:value={worldId} required>
    <option value="" disabled>Choose a world</option>
    {#each data.worlds as world}
      <option value={world.id}>{world.name}</option>
    {/each}
  </select>

  <textarea
    bind:value={portraitPrompt}
    placeholder="Portrait prompt (optional) — describe the close-up picture you want for this trainer. Leave blank to auto-generate from name/personality/sports."
    rows="3"
  ></textarea>

  <textarea
    bind:value={actionShotPrompt}
    placeholder="Action shot prompt (optional) — describe the full-body action picture. Leave blank to auto-generate from name/personality/sports."
    rows="3"
  ></textarea>

  <button onclick={createTrainer} >Create</button>
  <p>{status}</p>
