<script lang="ts">
	import { goto } from '$app/navigation';
	import { treaty } from '@elysiajs/eden';
	import type { App } from '../../../../../../api/src/index';
	import type { PageProps } from './$types';
	import WaitingScreen from '../../create/waitingScreen/page.svelte';

	const api = treaty<App>('http://localhost:3000');

	let { data }: PageProps = $props();
	let createSessionStatus = $state('');
	let onboardingSessionId = $state<number | null>(null);
	let selectedSports = $state<string[]>([]);
	let isWaiting = $state(false);

	async function startOnboardingSession() {
		createSessionStatus = `${data.trainer.name}... is getting his form ready `;
		onboardingSessionId = null;
		isWaiting = true;

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

		if (error) {
			console.error('Failed to create onboarding session', error);
			createSessionStatus = 'Failed to start onboarding session';
			isWaiting = false;
			return;
		}

		if (typeof created?.sessionId !== 'number') {
			createSessionStatus = 'Failed to start onboarding session';
			isWaiting = false;
			return;
		}

		onboardingSessionId = created.sessionId;
		createSessionStatus = 'Onboarding session started';

		// The flow this API expects is start -> initial-question -> message (see
		// apps/api/src/modules/onboarding/testOnboarding.sh / testFirstQuestion.sh).
		// The greeting from /onboarding/start is just the opening remarks; the first
		// real question ("give me your name/age/location") comes from this call.
		const { data: firstQuestion, error: firstQuestionError } = await api.onboarding[
			'initial-question'
		].post({
			sessionId: created.sessionId,
			claimToken: created.claimToken
		});

		if (firstQuestionError) {
			console.error('Failed to fetch first onboarding question', firstQuestionError);
			createSessionStatus = 'Failed to start onboarding session';
			isWaiting = false;
			return;
		}

		const initialMessages = [
			...(created.greeting ? [{ role: 'assistant', text: created.greeting }] : []),
			...(firstQuestion?.question ? [{ role: 'assistant', text: firstQuestion.question }] : [])
		];

		// claimToken has to travel with the session id because /onboarding/message
		// requires both to authenticate a turn. There's no backend endpoint to look
		// a session up again later, so we carry it in the URL alongside `meeting`.
		const params = new URLSearchParams({
			meeting: String(created.sessionId),
			claimToken: created.claimToken
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

{#if isWaiting}
	<WaitingScreen slug={data.trainer.slug} />
{:else}
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

	<button onclick={startOnboardingSession}>
		Start onboarding with {data.trainer.name}
	</button>

	{#if createSessionStatus}
		<p>{createSessionStatus}</p>
	{/if}

	{#if onboardingSessionId !== null}
		<p>Onboarding session ID: {onboardingSessionId}</p>
	{/if}
{/if}