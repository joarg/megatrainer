<script lang="ts">
	import { goto } from '$app/navigation';
	import { treaty } from '@elysiajs/eden';
	import type { App } from '../../../../../../api/src/index';
	import type { PageProps } from './$types';
	import GreetingScreen from '$lib/components/GreetingScreen.svelte';

	const api = treaty<App>('http://localhost:3000');

	let { data }: PageProps = $props();
	let createSessionStatus = $state('');
	let selectedSports = $state<string[]>([]);

	// 'greeting' shows the trainer's pre-made opening line (instant, no LLM call)
	// while the slower LLM-generated first question loads in the background below.
	let phase = $state<'idle' | 'greeting'>('idle');
	let greetingText = $state('');
	let sessionInfo = $state<{ sessionId: number; claimToken: string } | null>(null);
	// Populated once the background first-question request resolves; the
	// continue button stays disabled ("Preparing…") until this is non-null.
	let firstQuestionText = $state<string | null>(null);
	let isContinuing = $state(false);

	async function beginGreeting() {
		createSessionStatus = '';
		firstQuestionText = null;

		const fallbackSports = Array.isArray(data.trainer.sports) ? data.trainer.sports : [];
		const sportsForSession = selectedSports.length > 0 ? selectedSports : fallbackSports;

		// Frontend already knows the trainer's id from the page's own load (GET /trainers/{slug}),
		// so we resolve slug -> id here rather than asking the API to do it.
		// Eden's generated type for this route doesn't reflect that userId/userProfile
		// are optional server-side (a known treaty quirk with multi-content-type bodies).
		// The handler never reads them, so it's safe to omit here.
		const { data: created, error } = await api.onboarding.start.post({
			trainerId: data.trainer.id,
			selectedSport: sportsForSession
		} as Parameters<typeof api.onboarding.start.post>[0]);

		if (error || typeof created?.sessionId !== 'number') {
			console.error('Failed to create onboarding session', error);
			createSessionStatus = 'Failed to start onboarding session';
			return;
		}

		sessionInfo = { sessionId: created.sessionId, claimToken: created.claimToken };
		greetingText = created.greeting ?? data.trainer.initialGreeting ?? '';
		phase = 'greeting';

		// The flow this API expects is start -> initial-question -> message (see
		// apps/api/src/modules/onboarding/testOnboarding.sh / testFirstQuestion.sh).
		// The greeting is just the opening remarks; the first real question ("give
		// me your name/age/location") comes from this call and is LLM-generated,
		// so it's noticeably slower. Kick it off now (not awaited above) so it has
		// a head start while the user reads the greeting on screen; the button
		// stays disabled ("Preparing…") until this resolves below.
		const { data: firstQuestion, error: firstQuestionError } = await api.onboarding[
			'initial-question'
		].post({
			sessionId: created.sessionId,
			claimToken: created.claimToken
		});

		if (firstQuestionError) {
			console.error('Failed to fetch first onboarding question', firstQuestionError);
			createSessionStatus = 'Failed to start onboarding session';
			phase = 'idle';
			return;
		}

		firstQuestionText = firstQuestion?.question ?? '';
	}

	async function continueToOnboarding() {
		if (!sessionInfo || firstQuestionText === null || isContinuing) return;
		isContinuing = true;

		// The greeting was already shown (and read) on the greeting screen, so the
		// chat only needs to open with the first real question, not repeat it.
		const initialMessages = firstQuestionText
			? [{ role: 'assistant', text: firstQuestionText }]
			: [];

		// claimToken has to travel with the session id because /onboarding/message
		// requires both to authenticate a turn. There's no backend endpoint to look
		// a session up again later, so we carry it in the URL alongside `meeting`.
		const params = new URLSearchParams({
			meeting: String(sessionInfo.sessionId),
			claimToken: sessionInfo.claimToken
		});
		await goto(`/meet/${data.trainer.slug}/intro?${params.toString()}`, {
			state: { initialMessages }
		});
	}

	function toggleSport(sport: string, checked: boolean) {
		if (checked) {
			selectedSports = Array.from(new Set([...selectedSports, sport]));
			return;
		}

		selectedSports = selectedSports.filter((item) => item !== sport);
	}
</script>

<h1>Trainer Details</h1>

{#if phase === 'greeting'}
	<GreetingScreen
		trainerName={data.trainer.name}
		portraitUrl={data.trainer.portraitUrl ? 'http://localhost:3000' + data.trainer.portraitUrl : null}
		greeting={greetingText}
		isReady={firstQuestionText !== null}
		{isContinuing}
		onContinue={continueToOnboarding}
	/>
{:else}
	<a href={`/trainers/trainerdetails/${data.trainer.slug}/edit`}>Edit trainer</a>
	{#if data.trainer.portraitUrl}
		<img
			src={'http://localhost:3000' + data.trainer.portraitUrl}
			alt={data.trainer.name}
			width="256"
			style="border-radius: 12px;"
		/>
	{/if}
	<pre>{JSON.stringify(data.trainer, null, 2)}</pre>

	{#if Array.isArray(data.trainer.sports) && data.trainer.sports.length > 0}
		<h3>Select sports for this onboarding session</h3>
		{#each data.trainer.sports as sport}
			<label>
				<input
					type="checkbox"
					checked={selectedSports.includes(sport)}
					onchange={(event) =>
						toggleSport(sport, (event.currentTarget as HTMLInputElement).checked)}
				/>
				{sport}
			</label>
		{/each}
	{/if}

	<button onclick={beginGreeting}>
		Start onboarding with {data.trainer.name}
	</button>

	{#if createSessionStatus}
		<p>{createSessionStatus}</p>
	{/if}
{/if}