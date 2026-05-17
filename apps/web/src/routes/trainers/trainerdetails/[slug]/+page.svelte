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

		const { data: created, error } = await api
			.trainers({ slug: data.trainer.slug })
			.onboarding.session.post({ selectedSports: sportsForSession });

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

		const params = new URLSearchParams({
			meeting: String(created.sessionId)
		});
		await goto(`/meet/${data.trainer.slug}/intro?${params.toString()}`, {
			state: { initialMessages: created.messages ?? [] }
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