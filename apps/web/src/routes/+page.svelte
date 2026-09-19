<script lang="ts">
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import WorldCard from '$lib/components/WorldCard.svelte';

	let { data } = $props();
</script>

<SiteHeader title="Choose your world" />

<main>
	<section class="hero">
		<h1>Find your trainer.</h1>
		<p>
			Every trainer lives in a world with its own vibe, coaches and coaching style. Pick the one
			that fits how you want to be pushed.
		</p>
	</section>

	<section class="grid">
		{#each data.worlds as world (world.id)}
			<WorldCard {world} />
		{/each}
	</section>

	<footer>
		<p>
			Looking for the raw data instead? <a href="/trainers/list">Browse all trainers</a> or
			<a href="/trainers/create">create a new one</a>.
		</p>
	</footer>
</main>

<style>
	main {
		max-width: 1080px;
		margin: 0 auto;
		padding: 3rem 1.5rem 4rem;
	}

	.hero {
		text-align: center;
		max-width: 640px;
		margin: 0 auto 2.75rem;
	}

	.hero h1 {
		font-size: 2.4rem;
		margin: 0 0 0.75rem;
	}

	.hero p {
		margin: 0;
		color: var(--mt-text-muted);
		font-size: 1.05rem;
		line-height: 1.6;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	footer {
		margin-top: 3rem;
		text-align: center;
		font-size: 0.85rem;
		color: var(--mt-text-muted);
	}

	footer a {
		color: var(--mt-gold);
		font-weight: 600;
	}

	footer a:hover {
		text-decoration: underline;
	}
</style>

