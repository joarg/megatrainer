<script lang="ts">
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import TrainerCard from '$lib/components/TrainerCard.svelte';
	import { getWorldImage } from '$lib/assets/images';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const heroImage = $derived(data.world.imageUrl ?? getWorldImage(data.world.imageKey ?? data.world.slug));
</script>

<SiteHeader title={data.world.name} showBack />

<section
	class="hero"
	style={`--accent: ${data.world.accent}; ${heroImage ? `background-image: url(${heroImage})` : ''}`}
>
	<div class="scrim"></div>
	<div class="hero-content">
		<span class="eyebrow">World</span>
		<h1>{data.world.name}</h1>
		<p class="tagline">{data.world.tagline}</p>
		<p class="description">{data.world.description}</p>
	</div>
</section>

<main>
	{#if data.trainers.length === 0}
		<p class="empty">No trainers in this world yet.</p>
	{:else}
		<div class="grid">
			{#each data.trainers as trainer (trainer.slug)}
				<TrainerCard {...trainer} accent={data.world.accent} />
			{/each}
		</div>
	{/if}
</main>

<style>
	.hero {
		position: relative;
		padding: 4rem 2rem;
		background-size: cover;
		background-position: center;
		background-color: color-mix(in srgb, var(--accent) 25%, var(--mt-bg-elevated));
		overflow: hidden;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(11, 18, 32, 0.35) 0%, rgba(11, 18, 32, 0.96) 95%);
	}

	.hero-content {
		position: relative;
		max-width: 720px;
		margin: 0 auto;
		text-align: center;
	}

	.eyebrow {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
		margin-bottom: 0.5rem;
	}

	h1 {
		margin: 0 0 0.5rem;
		font-size: 2.4rem;
	}

	.tagline {
		margin: 0 0 0.6rem;
		font-weight: 600;
		color: var(--mt-text);
	}

	.description {
		margin: 0;
		color: var(--mt-text-muted);
		line-height: 1.6;
	}

	main {
		max-width: 1080px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem 4rem;
	}

	.grid {
		display: grid;
		/* auto-fill (not auto-fit) keeps empty tracks instead of collapsing
		 * them, and capping the upper bound at 280px (rather than 1fr) stops
		 * a single trainer's card from stretching to the full container width
		 * — which, combined with the portrait's tall aspect-ratio, used to
		 * blow the card up to an oversized image. */
		grid-template-columns: repeat(auto-fill, minmax(240px, 280px));
		justify-content: center;
		gap: 1.5rem;
	}

	.empty {
		text-align: center;
		color: var(--mt-text-muted);
	}
</style>
