<script lang="ts">
	let {
		trainerName,
		portraitUrl,
		greeting,
		isReady = false,
		isContinuing = false,
		onContinue
	}: {
		trainerName: string;
		portraitUrl?: string | null;
		greeting: string;
		/** True once the (LLM-generated) first question has finished loading in
		 * the background, so the continue button can be enabled. */
		isReady?: boolean;
		/** True once the user has tapped continue and we're navigating away. */
		isContinuing?: boolean;
		onContinue: () => void;
	} = $props();

	const buttonLabel = $derived(
		!isReady ? 'Preparing…' : isContinuing ? 'One moment…' : "Hell yeah, let's get started"
	);
</script>

<div class="greeting-screen">
	<div class="portrait">
		{#if portraitUrl}
			<img src={portraitUrl} alt={trainerName} />
		{:else}
			<span class="placeholder-mark">{trainerName[0]}</span>
		{/if}
	</div>

	<div class="dialogue">
		<span class="speaker">{trainerName}</span>
		<p class="greeting-text">{greeting}</p>
		<button class="continue-btn" onclick={onContinue} disabled={!isReady || isContinuing}>
			{buttonLabel}
		</button>
	</div>
</div>

<style>
	.greeting-screen {
		display: flex;
		align-items: center;
		gap: 2rem;
		min-height: 60vh;
		padding: 1rem;
	}

	.portrait {
		flex: 0 0 auto;
		width: 260px;
		aspect-ratio: 832 / 1216;
		border-radius: var(--mt-radius);
		background: var(--mt-bg-elevated);
		border: 1px solid var(--mt-panel-border);
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.portrait img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center top;
	}

	.placeholder-mark {
		font-size: 4rem;
		font-weight: 800;
		color: var(--mt-text-muted);
		opacity: 0.55;
	}

	.dialogue {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1rem;
		max-width: 34rem;
		background: var(--mt-panel);
		border: 1px solid var(--mt-panel-border);
		border-radius: var(--mt-radius);
		padding: 1.5rem;
	}

	.speaker {
		font-weight: 700;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--mt-gold);
	}

	.greeting-text {
		margin: 0;
		white-space: pre-wrap;
		line-height: 1.5;
	}

	.continue-btn {
		padding: 0.65rem 1.25rem;
		font-size: 1rem;
		font-weight: 700;
		background: var(--mt-gold);
		color: #1a1200;
		border: none;
		border-radius: 999px;
		cursor: pointer;
	}

	.continue-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
