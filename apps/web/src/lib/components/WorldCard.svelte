<script lang="ts">
	import { getWorldImage } from '$lib/assets/images';

	type World = {
		id: number;
		slug: string;
		name: string;
		tagline: string;
		description: string;
		accent: string;
		imageKey: string | null;
		/** AI-generated cover image, served by the API. Takes priority over
		 * the static asset lookup — see WorldCard's trainer-card counterpart. */
		imageUrl?: string | null;
	};

	let { world }: { world: World } = $props();

	const image = $derived(world.imageUrl ?? getWorldImage(world.imageKey ?? world.slug));
</script>

<a class="world-card" href={`/worlds/${world.slug}`} style={`--accent: ${world.accent}`}>
	<div class="art" style={image ? `background-image: url(${image})` : ''}>
		{#if !image}
			<span class="placeholder-mark">{world.name[0]}</span>
		{/if}
		<div class="scrim"></div>
	</div>

	<div class="content">
		<h2>{world.name}</h2>
		<p class="tagline">{world.tagline}</p>
		<p class="description">{world.description}</p>
		<span class="cta">Enter world <span class="arrow">&rarr;</span></span>
	</div>
</a>

<style>
	.world-card {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		min-height: 420px;
		border-radius: var(--mt-radius);
		overflow: hidden;
		border: 1px solid var(--mt-panel-border);
		background: var(--mt-bg-elevated);
		transition:
			transform 0.25s ease,
			box-shadow 0.25s ease,
			border-color 0.25s ease;
	}

	.world-card:hover {
		transform: translateY(-6px);
		border-color: var(--accent);
		box-shadow: 0 20px 45px -20px var(--accent);
	}

	.art {
		position: absolute;
		inset: 0;
		background-size: cover;
		background-position: center;
		background-color: color-mix(in srgb, var(--accent) 30%, var(--mt-bg-elevated));
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-mark {
		font-size: 5rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--accent) 70%, white);
		opacity: 0.5;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(11, 18, 32, 0.15) 0%, rgba(11, 18, 32, 0.95) 88%);
	}

	.content {
		position: relative;
		padding: 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	h2 {
		margin: 0;
		font-size: 1.6rem;
	}

	.tagline {
		margin: 0;
		color: var(--accent);
		font-weight: 600;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.description {
		margin: 0.3rem 0 0.75rem;
		color: var(--mt-text-muted);
		font-size: 0.92rem;
		line-height: 1.5;
	}

	.cta {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--mt-text);
	}

	.arrow {
		display: inline-block;
		transition: transform 0.2s ease;
	}

	.world-card:hover .arrow {
		transform: translateX(4px);
	}
</style>
