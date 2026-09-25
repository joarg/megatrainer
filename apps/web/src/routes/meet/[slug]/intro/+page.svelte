<script lang="ts">
	import { treaty } from '@elysiajs/eden';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import type { App } from '../../../../../../api/src/index';
	import ProfilePanel from '$lib/components/ProfilePanel.svelte';
	import {
		phasesWithCopy,
		PROFILE_PHASES,
		requestedFields,
		type OnboardingField,
	} from '$lib/onboarding/profile';

	const api = treaty<App>('http://localhost:3000');

	type ConversationMessage = {
		id: number;
		role: 'assistant' | 'user' | 'manager';
		text: string;
		askedFor?: OnboardingField[];
		requestState?: 'waiting' | 'evaluating' | 'evaluated';
		answeredFieldKeys?: string[];
	};

	let { data }: PageProps = $props();

	let userMessage = $state('');
	let messageCounter = $state(0);
	// There's no endpoint to re-fetch a session's chat history, so the only source
	// for the opening messages is the navigation state set by the page that created
	// the session (see the $effect below). On a hard refresh this will start empty.
	let conversation = $state<ConversationMessage[]>([]);
	let sendStatus = $state('');
	let isSending = $state(false);

	// currentProfile is only ever updated from /onboarding/message responses below;
	// there's no way to hydrate it from the server on load (see +page.server.ts).
	let currentProfile = $state<Record<string, unknown> | null>(null);
	// Same caveat as currentProfile: phase state only advances from /onboarding/message
	// responses, so it starts at the first phase on a fresh load.
	let currentPhase = $state('basicInfo');
	let onboardingComplete = $state(false);
	let showProfileOnMobile = $state(false);
	let trainerActivityIndex = $state(0);
	const onboardingPhases = $derived(phasesWithCopy(data.trainer.panelCopy));
	const currentPhaseIndex = $derived(
		Math.max(0, PROFILE_PHASES.findIndex((phase) => phase.key === currentPhase)),
	);
	const mobileStatusLabel = $derived(
		onboardingComplete
			? 'Onboarding complete'
			: `Step ${currentPhaseIndex + 1} of ${PROFILE_PHASES.length}: ${onboardingPhases[currentPhaseIndex]?.label ?? 'Onboarding'}`,
	);
	const trainerActivities = [
		{ label: 'is reading', icon: '👀' },
		{ label: 'is thinking', icon: '🤔' },
		{ label: 'is typing', icon: '⌨️' },
	];
	const trainerActivity = $derived(trainerActivities[trainerActivityIndex]);

	$effect(() => {
		if (!isSending) {
			trainerActivityIndex = 0;
			return;
		}

		const interval = setInterval(() => {
			trainerActivityIndex = (trainerActivityIndex + 1) % trainerActivities.length;
		}, 1500);

		return () => clearInterval(interval);
	});

	function updateLatestTrainerRequest(
		update: (message: ConversationMessage) => ConversationMessage,
	): ConversationMessage | undefined {
		const latestTrainerMessage = [...conversation].reverse().find((message) => message.role === 'assistant' && message.askedFor);
		if (!latestTrainerMessage) return undefined;

		conversation = conversation.map((message) =>
			message.id === latestTrainerMessage.id ? update(message) : message,
		);
		return latestTrainerMessage;
	}

	$effect(() => {
		const stateMessages = (page.state as { initialMessages?: Array<{ role: string; text: string }> })?.initialMessages;
		if (stateMessages && stateMessages.length > 0) {
			conversation = stateMessages.map((msg, i) => ({
				id: i,
				role: msg.role as ConversationMessage['role'],
				text: msg.text,
				askedFor:
					msg.role === 'assistant'
						? requestedFields({
								profile: null,
								phase: 'basicInfo',
								complete: false,
								copy: data.trainer.panelCopy,
							})
						: undefined,
			}));
			messageCounter = stateMessages.length;
		}
	});

	async function onMessageSubmit(event: SubmitEvent) {
		event.preventDefault();

		const trimmedMessage = userMessage.trim();
		if (!trimmedMessage || isSending) return;

		conversation = [...conversation, { id: messageCounter, role: 'user', text: trimmedMessage }];
		messageCounter += 1;
		const requestBeingEvaluated = updateLatestTrainerRequest((message) => ({
			...message,
			requestState: 'evaluating',
		}));
		isSending = true;
		sendStatus = 'Sending...';

		const startedAt = Date.now();
		const { data: result, error } = await api.onboarding.message.post({
			sessionId: data.sessionId,
			claimToken: data.claimToken,
			userInput: trimmedMessage,
		});

		if (error || !result) {
			console.error('Failed to send onboarding message', error);
			if (requestBeingEvaluated) {
				conversation = conversation.map((message) =>
					message.id === requestBeingEvaluated.id ? { ...message, requestState: 'waiting' } : message,
				);
			}
			sendStatus = 'Failed to send message';
			isSending = false;
			return;
		}

		const updatedProfile = (result.updatedUserProfile as Record<string, unknown>) ?? currentProfile;
		const updatedPhase = (result as { phase?: string }).phase ?? currentPhase;
		const isComplete = (result as { onboardingComplete?: boolean }).onboardingComplete ?? onboardingComplete;
		const requestedFieldsForEvaluation = requestBeingEvaluated?.askedFor;
		if (requestBeingEvaluated && requestedFieldsForEvaluation) {
			conversation = conversation.map((message) =>
				message.id === requestBeingEvaluated.id
					? {
							...message,
							requestState: 'evaluated',
							answeredFieldKeys: requestedFieldsForEvaluation
								.filter((field) => {
									const value = updatedProfile?.[field.key];
									return Array.isArray(value)
										? value.some((entry) => typeof entry !== 'string' || entry.trim().length > 0)
										: typeof value === 'string'
											? value.trim().length > 0
											: value !== null && value !== undefined;
								})
								.map((field) => field.key),
						}
					: message,
			);
		}
		conversation = [
			...conversation,
			{
				id: messageCounter++,
				role: 'assistant',
				text: result.question ?? '',
				askedFor: requestedFields({
					profile: updatedProfile,
					phase: updatedPhase,
					complete: isComplete,
					copy: data.trainer.panelCopy,
				}),
				requestState: 'waiting',
			},
		];
		currentProfile = updatedProfile;
		currentPhase = updatedPhase;
		onboardingComplete = isComplete;

		sendStatus = `Message sent in ${Date.now() - startedAt} ms`;
		userMessage = '';
		isSending = false;
	}
</script>

<div class="layout">
	<button
		type="button"
		class="profile-toggle"
		class:open={showProfileOnMobile}
		aria-expanded={showProfileOnMobile}
		aria-controls="profile-panel"
		onclick={() => (showProfileOnMobile = !showProfileOnMobile)}
	>
		<span class="status-progress" aria-hidden="true">
			{#each PROFILE_PHASES as _, index (index)}
				<span class:complete={onboardingComplete || index < currentPhaseIndex} class:current={!onboardingComplete && index === currentPhaseIndex}></span>
			{/each}
		</span>
		<span class="status-copy">
			<span class="status-title">{mobileStatusLabel}</span>
			<span class="status-action">{showProfileOnMobile ? 'Collapse profile' : 'View profile'}</span>
		</span>
		<span class="status-chevron" aria-hidden="true">{showProfileOnMobile ? '▲' : '▼'}</span>
	</button>

	<div class="chat-col">
		{#if conversation.length > 0}
			<div class="conversation">
				{#each conversation as message (message.id)}
					<article class="bubble {message.role}">
						<div class="message-head">
							{#if message.role === 'assistant'}
								{#if data.trainer.portraitUrl}
									<img
										class="trainer-avatar"
										src={'http://localhost:3000' + data.trainer.portraitUrl}
										alt=""
									/>
								{:else}
									<span class="trainer-avatar fallback" aria-hidden="true">
										{data.trainer.name.slice(0, 1).toUpperCase()}
									</span>
								{/if}
							{/if}
							<strong>{message.role === 'assistant' ? data.trainer.name : message.role === 'manager' ? 'Manager' : 'You'}</strong>
						</div>
						<p>{message.text}</p>
					</article>
					{#if message.role === 'assistant' && message.askedFor && message.askedFor.length > 0}
						<aside
							class="request-summary"
							class:evaluating={message.requestState === 'evaluating'}
							aria-label="Trainer request summary"
						>
							{#if message.requestState === 'evaluating'}
								<span class="request-status">
									<span class="spinner" aria-hidden="true"></span>
									<span aria-hidden="true">{trainerActivity.icon}</span>
									{data.trainer.name} {trainerActivity.label}...
								</span>
							{:else}
								<span class="trainer-name">{data.trainer.name} asks for</span>
								<span class="summary-icon" aria-hidden="true">✦</span>
							{/if}
							<ul>
								{#each message.askedFor as field (field.key)}
									{@const answered = message.answeredFieldKeys?.includes(field.key) ?? false}
									<li class:answered>
										<span aria-hidden="true">{answered ? '✓' : field.icon}</span>{field.label}
									</li>
								{/each}
							</ul>
						</aside>
					{/if}
				{/each}
			</div>
		{/if}

		<form onsubmit={onMessageSubmit}>
			<label for="user-message">Your message</label>
			<input
				id="user-message"
				type="text"
				bind:value={userMessage}
				placeholder="Type your message..."
				autocomplete="off"
			/>
			<button type="submit" disabled={!userMessage.trim() || isSending}>Send</button>
		</form>

		{#if sendStatus}
			<p class="send-status">{sendStatus}</p>
		{/if}
	</div>

	{#if showProfileOnMobile}
		<button
			type="button"
			class="profile-backdrop"
			aria-label="Collapse profile"
			onclick={() => (showProfileOnMobile = false)}
		></button>
	{/if}

	<aside id="profile-panel" class="profile-col" class:open={showProfileOnMobile}>
		<ProfilePanel
			profile={currentProfile}
			phase={currentPhase}
			complete={onboardingComplete}
			copy={data.trainer.panelCopy}
			awaitingReply={isSending}
		/>

		<details class="debug-details">
			<summary>Debug: raw profile</summary>
			<pre class="raw">{JSON.stringify(currentProfile, null, 2)}</pre>
		</details>
	</aside>

</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 1fr 420px;
		gap: 1.5rem;
		align-items: start;
		min-height: 100vh;
		padding: 1rem;
		box-sizing: border-box;
	}

	.chat-col {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.conversation {
		display: grid;
		gap: 0.75rem;
	}

	.bubble {
		padding: 0.75rem;
		border-radius: 0.5rem;
		max-width: 40rem;
	}

	.bubble.assistant {
		background: #1e293b;
		color: #f8fafc;
	}

	.bubble.user {
		background: #334155;
		color: #f8fafc;
		justify-self: end;
	}

	.bubble p {
		margin: 0.25rem 0 0;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.message-head {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}

	.trainer-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid rgba(240, 180, 41, 0.65);
		border-radius: 50%;
		object-fit: cover;
	}

	.trainer-avatar.fallback {
		display: grid;
		place-items: center;
		background: #f0b429;
		color: #0f172a;
		font-size: 0.9rem;
		font-weight: 700;
	}

	.request-summary {
		max-width: 40rem;
		margin: -0.25rem 0 0.25rem;
		padding: 0.35rem 0.55rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		border: 1px dashed rgba(125, 211, 252, 0.35);
		border-radius: 0.5rem;
		background: rgba(125, 211, 252, 0.06);
		color: #e0f2fe;
		font-size: 0.72rem;
		transition: border-color 180ms ease, background 180ms ease;
	}

	.request-summary.evaluating {
		animation: request-pulse 1.2s ease-in-out infinite;
		border-color: rgba(125, 211, 252, 0.7);
	}

	.summary-icon {
		flex: none;
		color: #7dd3fc;
		font-size: 0.9rem;
	}

	.request-status {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		color: #bae6fd;
		white-space: nowrap;
	}

	.spinner {
		width: 0.65rem;
		height: 0.65rem;
		border: 2px solid rgba(125, 211, 252, 0.35);
		border-top-color: #7dd3fc;
		border-radius: 50%;
		animation: spin 700ms linear infinite;
	}

	.trainer-name {
		flex: none;
		font-weight: 700;
		color: #e0f2fe;
	}

	.request-summary ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.request-summary li {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		padding: 0.12rem 0.35rem;
		border-radius: 999px;
		background: rgba(125, 211, 252, 0.12);
	}

	.request-summary li.answered {
		background: rgba(74, 222, 128, 0.16);
		color: #bbf7d0;
	}

	@keyframes request-pulse {
		50% {
			background: rgba(125, 211, 252, 0.13);
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 40rem;
	}

	input {
		background: #f8fafc;
		color: #0f172a;
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.375rem;
	}

	button {
		padding: 0.5rem 1rem;
		align-self: flex-start;
		background: #f0b429;
		color: #0f172a;
		border: 1px solid #f0b429;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.complete-banner {
		padding: 1rem 1.25rem;
		background: #f0fdf4;
		border: 1px solid #86efac;
		border-radius: 0.5rem;
		color: #166534;
		font-size: 0.95rem;
	}

	.send-status {
		font-size: 0.85rem;
		color: #64748b;
		margin: 0;
	}

	.profile-col {
		position: sticky;
		top: 1rem;
		overflow-y: auto;
		max-height: calc(100vh - 2rem);
	}

	/* The profile panel is the primary sidebar on desktop; on small screens it
	   collapses behind a toggle so the chat keeps the full viewport. */
	.profile-toggle {
		display: none;
	}

	.debug-details {
		margin-top: 0.75rem;
		font-size: 0.75rem;
		color: #64748b;
	}

	.debug-details summary {
		cursor: pointer;
	}

	.raw {
		margin: 0;
		font-size: 0.7rem;
		color: #94a3b8;
		white-space: pre-wrap;
		word-break: break-all;
		line-height: 1.4;
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: 1fr;
			padding: 4.5rem 0.75rem 0.75rem;
		}

		.chat-col {
			order: 1;
		}

		.profile-col {
			order: 2;
			position: fixed;
			top: 4.45rem;
			left: 0.75rem;
			right: 0.75rem;
			z-index: 11;
			max-height: calc(50vh - 4.45rem);
			display: block;
			overflow-y: auto;
			opacity: 0;
			transform: translateY(-1rem);
			pointer-events: none;
			transition: opacity 180ms ease, transform 220ms ease;
		}

		.profile-col.open {
			opacity: 1;
			transform: translateY(0);
			pointer-events: auto;
		}

		.bubble {
			max-width: 100%;
		}

		.profile-toggle {
			display: block;
			position: fixed;
			left: 0.75rem;
			right: 0.75rem;
			top: 0.75rem;
			z-index: 10;
			align-self: auto;
			padding: 0.65rem 0.8rem;
			display: flex;
			align-items: center;
			gap: 0.65rem;
			background: var(--mt-bg-elevated, #111a2c);
			border-color: rgba(240, 180, 41, 0.55);
			color: var(--mt-text, #e5e9f0);
			text-align: left;
			box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
			transition: border-color 180ms ease, background 180ms ease;
		}

		.profile-toggle.open {
			background: #17243a;
			border-color: var(--mt-gold, #f0b429);
		}

		.status-progress {
			display: flex;
			gap: 0.2rem;
		}

		.status-progress span {
			width: 0.4rem;
			height: 1.6rem;
			border-radius: 999px;
			background: rgba(255, 255, 255, 0.14);
		}

		.status-progress span.complete {
			background: #86efac;
		}

		.status-progress span.current {
			background: var(--mt-gold, #f0b429);
		}

		.status-copy {
			flex: 1;
			min-width: 0;
			display: flex;
			flex-direction: column;
			gap: 0.05rem;
		}

		.status-title {
			overflow: hidden;
			font-size: 0.82rem;
			font-weight: 700;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.status-action {
			color: var(--mt-text-muted, #94a3b8);
			font-size: 0.68rem;
			font-weight: 500;
		}

		.status-chevron {
			color: var(--mt-gold, #f0b429);
		}

		.profile-backdrop {
			position: fixed;
			inset: 0;
			z-index: 10;
			width: auto;
			padding: 0;
			background: rgba(3, 7, 18, 0.48);
			border: none;
			border-radius: 0;
		}
	}
</style>
