<script lang="ts">
	import { treaty } from '@elysiajs/eden';
	import { invalidateAll } from '$app/navigation';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import type { App } from '../../../../../api/src/index';

	const api = treaty<App>('http://localhost:3000');

	let { data } = $props();

	let slug = $state('');
	let name = $state('');
	let tagline = $state('');
	let description = $state('');
	let accent = $state('#e2543c');
	let imageKey = $state('');
	let imagePrompt = $state('');
	let status = $state('');

	let editingSlug = $state<string | null>(null);
	let editName = $state('');
	let editTagline = $state('');
	let editDescription = $state('');
	let editAccent = $state('');
	let editImageKey = $state('');
	let editImagePrompt = $state('');
	let regenerateStatus = $state<Record<string, string>>({});
	let isRegenerating = $state<Record<string, boolean>>({});

	async function createWorld() {
		status = 'Creating world... this can take a minute while the cover image generates';
		const { error } = await api.worlds.post({
			slug: slug.trim(),
			name: name.trim(),
			tagline: tagline.trim(),
			description: description.trim(),
			accent: accent.trim(),
			imageKey: imageKey.trim(),
			imagePrompt: imagePrompt.trim()
		});

		if (error) {
			console.error('Failed to create world:', error);
			status = 'Failed to create world (slug may already exist)';
			return;
		}

		slug = '';
		name = '';
		tagline = '';
		description = '';
		accent = '#e2543c';
		imageKey = '';
		imagePrompt = '';
		status = 'World created';
		await invalidateAll();
	}

	function startEdit(world: (typeof data.worlds)[number]) {
		editingSlug = world.slug;
		editName = world.name;
		editTagline = world.tagline;
		editDescription = world.description;
		editAccent = world.accent;
		editImageKey = world.imageKey ?? '';
		editImagePrompt = world.imagePrompt ?? '';
	}

	function cancelEdit() {
		editingSlug = null;
	}

	async function saveEdit(worldSlug: string) {
		const { error } = await api.worlds({ slug: worldSlug }).patch({
			name: editName.trim(),
			tagline: editTagline.trim(),
			description: editDescription.trim(),
			accent: editAccent.trim(),
			imageKey: editImageKey.trim()
		});

		if (error) {
			console.error('Failed to update world:', error);
			status = 'Failed to update world';
			return;
		}

		editingSlug = null;
		await invalidateAll();
	}

	async function regenerateImage(worldSlug: string) {
		isRegenerating = { ...isRegenerating, [worldSlug]: true };
		regenerateStatus = {
			...regenerateStatus,
			[worldSlug]: 'Generating a new cover image... this can take a minute'
		};

		const { error } = await api.worlds({ slug: worldSlug })['regenerate-image'].post({
			imagePrompt: editImagePrompt.trim()
		});

		isRegenerating = { ...isRegenerating, [worldSlug]: false };

		if (error) {
			console.error('Failed to regenerate world image:', error);
			regenerateStatus = { ...regenerateStatus, [worldSlug]: 'Failed to generate a new cover image' };
			return;
		}

		regenerateStatus = { ...regenerateStatus, [worldSlug]: 'New cover image generated' };
		await invalidateAll();
	}

	async function deleteWorld(worldSlug: string) {
		if (!confirm(`Delete world "${worldSlug}"? Trainers in it will be unassigned, not deleted.`)) {
			return;
		}

		const { error } = await api.worlds({ slug: worldSlug }).delete();

		if (error) {
			console.error('Failed to delete world:', error);
			status = 'Failed to delete world';
			return;
		}

		await invalidateAll();
	}
</script>

<SiteHeader title="Manage Worlds" showBack />

<main>
	<h1>Manage Worlds</h1>

	<section class="create-form">
		<h2>Create a new world</h2>
		<input bind:value={slug} placeholder="Slug (e.g. macho-world)" required />
		<input bind:value={name} placeholder="Name" required />
		<input bind:value={tagline} placeholder="Tagline" required />
		<textarea bind:value={description} placeholder="Description" rows="3" required></textarea>
		<label class="accent-field">
			Accent color
			<input type="color" bind:value={accent} />
		</label>
		<input bind:value={imageKey} placeholder="Image key (optional, defaults to slug)" />
		<textarea
			bind:value={imagePrompt}
			rows="2"
			placeholder="Cover image prompt (optional, describes the AI-generated cover photo; leave blank to auto-generate from name/tagline/description)"
		></textarea>
		<button onclick={createWorld}>Create world</button>
		{#if status}
			<p class="status">{status}</p>
		{/if}
	</section>

	<section class="world-list">
		<h2>Existing worlds</h2>
		{#if data.worlds.length === 0}
			<p>No worlds yet.</p>
		{/if}
		{#each data.worlds as world (world.slug)}
			<div class="world-row" style={`--accent: ${world.accent}`}>
				{#if editingSlug === world.slug}
					<input bind:value={editName} placeholder="Name" />
					<input bind:value={editTagline} placeholder="Tagline" />
					<textarea bind:value={editDescription} rows="2"></textarea>
					<input type="color" bind:value={editAccent} />
					<input bind:value={editImageKey} placeholder="Image key" />
					<div class="actions">
						<button onclick={() => saveEdit(world.slug)}>Save</button>
						<button onclick={cancelEdit}>Cancel</button>
					</div>

					<div class="image-panel">
						{#if world.imageUrl}
							<img src={world.imageUrl} alt={`${world.name} cover`} width="200" style="border-radius: 8px;" />
						{/if}
						<textarea
							bind:value={editImagePrompt}
							rows="2"
							placeholder="Cover image prompt. Leave blank to auto-generate from name/tagline/description."
						></textarea>
						<button onclick={() => regenerateImage(world.slug)} disabled={isRegenerating[world.slug]}>
							{isRegenerating[world.slug] ? 'Generating...' : 'Regenerate cover image'}
						</button>
						{#if regenerateStatus[world.slug]}
							<p class="status">{regenerateStatus[world.slug]}</p>
						{/if}
					</div>
				{:else}
					<div class="world-info">
						{#if world.imageUrl}
							<img
								src={world.imageUrl}
								alt={`${world.name} cover`}
								width="72"
								style="border-radius: 6px; object-fit: cover; aspect-ratio: 1216 / 832;"
							/>
						{:else}
							<span class="swatch" style={`background: ${world.accent}`}></span>
						{/if}
						<div>
							<strong>{world.name}</strong> <span class="slug">({world.slug})</span>
							<p class="tagline">{world.tagline}</p>
							<p class="description">{world.description}</p>
						</div>
					</div>
					<div class="actions">
						<button onclick={() => startEdit(world)}>Edit</button>
						<button onclick={() => deleteWorld(world.slug)}>Delete</button>
					</div>
				{/if}
			</div>
		{/each}
	</section>
</main>

<style>
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 2rem 1.5rem 4rem;
	}

	.create-form,
	.world-row {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		border: 1px solid var(--mt-panel-border, #333);
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.accent-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.world-info {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.image-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border-top: 1px dashed var(--mt-panel-border, #333);
		padding-top: 0.6rem;
	}

	.swatch {
		width: 1.2rem;
		height: 1.2rem;
		border-radius: 50%;
		flex-shrink: 0;
		margin-top: 0.2rem;
	}

	.slug {
		opacity: 0.6;
		font-size: 0.85rem;
	}

	.tagline {
		margin: 0.2rem 0 0;
		font-weight: 600;
	}

	.description {
		margin: 0.2rem 0 0;
		opacity: 0.8;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.status {
		font-size: 0.85rem;
	}
</style>

