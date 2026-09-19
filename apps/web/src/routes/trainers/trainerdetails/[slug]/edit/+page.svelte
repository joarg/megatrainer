<script lang="ts">
	import { treaty } from '@elysiajs/eden';
	import { invalidateAll } from '$app/navigation';
	import { untrack } from 'svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import type { App } from '../../../../../../../api/src/index';
	import type { PageProps } from './$types';

	const api = treaty<App>('http://localhost:3000');
	const API_URL = 'http://localhost:3000';

	let { data }: PageProps = $props();

	// Editable copies of the trainer's fields, seeded once from the initial
	// load. Deliberately not kept in sync with `data` afterwards: edits here
	// should win over whatever a background invalidateAll() re-fetches.
	let tagline = $state(untrack(() => data.trainer.tagline ?? ''));
	let initialGreeting = $state(untrack(() => data.trainer.initialGreeting ?? ''));
	let personality = $state(untrack(() => data.trainer.personality ?? ''));
	let portraitPrompt = $state(untrack(() => data.trainer.portraitPrompt ?? ''));
	let actionShotPrompt = $state(untrack(() => data.trainer.actionShotPrompt ?? ''));

	let textStatus = $state('');
	let portraitStatus = $state('');
	let actionShotStatus = $state('');
	let isRegeneratingPortrait = $state(false);
	let isRegeneratingActionShot = $state(false);

	async function saveText() {
		textStatus = 'Saving...';

		const { error } = await api.trainers({ slug: data.trainer.slug }).patch({
			tagline: tagline.trim(),
			initialGreeting: initialGreeting.trim(),
			personality: personality.trim()
		});

		if (error) {
			console.error('Failed to update trainer:', error);
			textStatus = 'Failed to save changes';
			return;
		}

		textStatus = 'Saved';
		await invalidateAll();
	}

	async function regeneratePortrait() {
		isRegeneratingPortrait = true;
		portraitStatus = `Generating a new portrait for ${data.trainer.name}... this can take a minute`;

		const { error } = await api.trainers({ slug: data.trainer.slug })['regenerate-portrait'].post({
			portraitPrompt: portraitPrompt.trim()
		});

		isRegeneratingPortrait = false;

		if (error) {
			console.error('Failed to regenerate trainer portrait:', error);
			portraitStatus = 'Failed to generate a new portrait';
			return;
		}

		portraitStatus = 'New portrait generated';
		await invalidateAll();
	}

	async function regenerateActionShot() {
		isRegeneratingActionShot = true;
		actionShotStatus = `Generating a new action shot for ${data.trainer.name}... this can take a minute`;

		const { error } = await api.trainers({ slug: data.trainer.slug })['regenerate-action-shot'].post({
			actionShotPrompt: actionShotPrompt.trim()
		});

		isRegeneratingActionShot = false;

		if (error) {
			console.error('Failed to regenerate trainer action shot:', error);
			const value = error.value as { error?: string } | undefined;
			actionShotStatus = value?.error ?? 'Failed to generate a new action shot';
			return;
		}

		actionShotStatus = 'New action shot generated';
		await invalidateAll();
	}
</script>

<SiteHeader title="Edit Trainer" showBack />

<main>
	<h1>Edit {data.trainer.name}</h1>

	<section class="panel">
		<h2>Text content</h2>
		<label>
			Tagline
			<input bind:value={tagline} placeholder="Short specialty line" />
		</label>
		<label>
			Initial message
			<textarea bind:value={initialGreeting} rows="4" placeholder="Initial greeting"></textarea>
		</label>
		<label>
			Personality
			<textarea bind:value={personality} rows="4" placeholder="Personality"></textarea>
		</label>
		<button onclick={saveText}>Save changes</button>
		{#if textStatus}
			<p class="status">{textStatus}</p>
		{/if}
	</section>

	<section class="panel">
		<h2>Portrait</h2>
		{#if data.trainer.portraitUrl}
			<img
				src={API_URL + data.trainer.portraitUrl}
				alt={`${data.trainer.name} portrait`}
				width="192"
				style="border-radius: 12px;"
			/>
		{/if}
		<label>
			Portrait prompt
			<textarea
				bind:value={portraitPrompt}
				rows="3"
				placeholder="Describe the close-up picture you want. Leave blank to auto-generate from name/personality/sports."
			></textarea>
		</label>
		<button onclick={regeneratePortrait} disabled={isRegeneratingPortrait}>
			{isRegeneratingPortrait ? 'Generating...' : 'Regenerate portrait'}
		</button>
		{#if portraitStatus}
			<p class="status">{portraitStatus}</p>
		{/if}
	</section>

	<section class="panel">
		<h2>Action shot</h2>
		{#if data.trainer.actionShotUrl}
			<img
				src={API_URL + data.trainer.actionShotUrl}
				alt={`${data.trainer.name} action shot`}
				width="192"
				style="border-radius: 12px;"
			/>
		{/if}
		<label>
			Action shot prompt
			<textarea
				bind:value={actionShotPrompt}
				rows="3"
				placeholder="Describe the full-body action picture. Leave blank to auto-generate from name/personality/sports."
			></textarea>
		</label>
		<button
			onclick={regenerateActionShot}
			disabled={isRegeneratingActionShot || !data.trainer.portraitUrl}
		>
			{isRegeneratingActionShot ? 'Generating...' : 'Regenerate action shot'}
		</button>
		{#if !data.trainer.portraitUrl}
			<p class="status">Generate a portrait first — the action shot reuses it for a consistent look.</p>
		{/if}
		{#if actionShotStatus}
			<p class="status">{actionShotStatus}</p>
		{/if}
	</section>

	<a href={`/trainers/trainerdetails/${data.trainer.slug}`}>Back to trainer</a>
</main>

<style>
	main {
		max-width: 640px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border: 1px solid var(--mt-panel-border, #333);
		border-radius: 8px;
		padding: 1.25rem;
		margin-bottom: 1.5rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.85rem;
		color: var(--mt-text-muted);
	}

	.status {
		font-size: 0.85rem;
	}
</style>
