<script lang="ts">
	import { getTrainerImage } from '$lib/assets/images';

	let {
		slug,
		name,
		tagline,
		sports = [],
		imageKey,
		imageUrl = null,
		accent
	}: {
		slug: string;
		name: string;
		tagline: string;
		sports?: string[];
		imageKey: string;
		/** AI-generated cover image (action shot, falling back to portrait)
		 * served by the API. Takes priority over the static asset lookup. */
		imageUrl?: string | null;
		accent: string;
	} = $props();

	const image = $derived(imageUrl ?? getTrainerImage(imageKey));
</script>

<a class="trainer-card" href={`/trainers/trainerdetails/${slug}`} style={`--accent: ${accent}`}>
	<div class="portrait" style={image ? `background-image: url(${image})` : ''}>
		{#if !image}
			<span class="placeholder-mark">{name[0]}</span>
		{/if}
	</div>

	<div class="content">
		<h3>{name}</h3>
		<p class="tagline">{tagline}</p>
		{#if sports.length > 0}
			<ul class="tags">
				{#each sports as sport}
					<li>{sport}</li>
				{/each}
			</ul>
		{/if}
		<span class="cta">Meet {name.split(' ')[0]} <span class="arrow">&rarr;</span></span>
	</div>
</a>

<style>
	.trainer-card {
		display: flex;
		flex-direction: column;
		border-radius: var(--mt-radius);
		overflow: hidden;
		background: var(--mt-panel);
		border: 1px solid var(--mt-panel-border);
		transition:
			transform 0.2s ease,
			border-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.trainer-card:hover {
		transform: translateY(-4px);
		border-color: var(--accent);
		box-shadow: 0 16px 32px -18px var(--accent);
	}

	.portrait {
		/* Matches the generated action shot's aspect ratio (832x1216, see
		 * ACTION_SHOT_WIDTH/HEIGHT in image-engine/config.ts) so the full-body
		 * cover photo displays intact instead of being cropped down to a thin
		 * horizontal strip by a fixed short height. */
		aspect-ratio: 832 / 1216;
		background-size: cover;
		background-position: center top;
		background-color: color-mix(in srgb, var(--accent) 25%, var(--mt-bg-elevated));
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-mark {
		font-size: 3.5rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--accent) 70%, white);
		opacity: 0.55;
	}

	.content {
		padding: 1.1rem 1.25rem 1.35rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.tagline {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 600;
		color: var(--accent);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.tags {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0.3rem 0 0.2rem;
		padding: 0;
	}

	.tags li {
		font-size: 0.72rem;
		color: var(--mt-text-muted);
		background: rgba(255, 255, 255, 0.06);
		border-radius: 999px;
		padding: 0.2rem 0.6rem;
	}

	.cta {
		margin-top: 0.4rem;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.arrow {
		display: inline-block;
		transition: transform 0.2s ease;
	}

	.trainer-card:hover .arrow {
		transform: translateX(4px);
	}
</style>
