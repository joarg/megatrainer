<script lang="ts">
	let { title = 'megaTrainer', showBack = false } = $props();
</script>

<header class="site-header">
	<a class="brand" href="/">
		<span class="brand-mark">MT</span>
		<span class="brand-name">megaTrainer</span>
	</a>

	<nav class="links">
		{#if showBack}
			<a href="/">Worlds</a>
		{/if}
		<a href="/trainers/list">All Trainers</a>
		<a href="/trainers/create">Create Trainer</a>
		<a href="/worlds/manage">Manage Worlds</a>
	</nav>

	<div class="title">{title}</div>
</header>

<style>
	.site-header {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem 2rem;
		background: rgba(11, 18, 32, 0.85);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--mt-panel-border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		flex-shrink: 0;
	}

	.brand-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 8px;
		background: var(--mt-gold);
		color: #1a1300;
		font-size: 0.8rem;
		font-weight: 800;
	}

	.brand-name {
		font-size: 1rem;
	}

	.links {
		display: flex;
		gap: 1.25rem;
		font-size: 0.85rem;
		color: var(--mt-text-muted);
	}

	.links a:hover {
		color: var(--mt-text);
	}

	.title {
		margin-left: auto;
		font-size: 0.85rem;
		color: var(--mt-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	@media (max-width: 640px) {
		.site-header {
			flex-wrap: wrap;
			gap: 0.75rem;
			padding: 1rem;
		}

		.title {
			margin-left: 0;
			order: 3;
		}
	}
</style>
