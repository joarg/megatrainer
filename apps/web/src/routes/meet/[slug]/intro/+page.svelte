<script lang="ts">
	import { treaty } from '@elysiajs/eden';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import type { App } from '../../../../../../api/src/index';
	import ProfilePanel from '$lib/components/ProfilePanel.svelte';

	const api = treaty<App>('http://localhost:3000');

	type ConversationMessage = {
		id: number;
		role: 'assistant' | 'user' | 'manager';
		text: string;
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

	$effect(() => {
		const stateMessages = (page.state as { initialMessages?: Array<{ role: string; text: string }> })?.initialMessages;
		if (stateMessages && stateMessages.length > 0) {
			conversation = stateMessages.map((msg, i) => ({
				id: i,
				role: msg.role as ConversationMessage['role'],
				text: msg.text,
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
			sendStatus = 'Failed to send message';
			isSending = false;
			return;
		}

		conversation = [...conversation, { id: messageCounter++, role: 'assistant', text: result.question ?? '' }];
		currentProfile = (result.updatedUserProfile as Record<string, unknown>) ?? currentProfile;
		currentPhase = (result as { phase?: string }).phase ?? currentPhase;
		onboardingComplete = (result as { onboardingComplete?: boolean }).onboardingComplete ?? onboardingComplete;

		sendStatus = `Message sent in ${Date.now() - startedAt} ms`;
		userMessage = '';
		isSending = false;
	}
</script>

<div class="layout">
	<div class="chat-col">
		<h1>Onboarding with {data.trainer.name}</h1>

		{#if conversation.length > 0}
			<div class="conversation">
				{#each conversation as message (message.id)}
					<article class="bubble {message.role}">
						<strong>{message.role === 'assistant' ? 'Trainer' : message.role === 'manager' ? 'Manager' : 'You'}</strong>
						<p>{message.text}</p>
					</article>
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

	<aside class="profile-col" class:open={showProfileOnMobile}>
		<ProfilePanel profile={currentProfile} phase={currentPhase} complete={onboardingComplete} />

		<details class="debug-details">
			<summary>Debug: raw profile</summary>
			<pre class="raw">{JSON.stringify(currentProfile, null, 2)}</pre>
		</details>
	</aside>

	<button
		type="button"
		class="profile-toggle"
		aria-expanded={showProfileOnMobile}
		onclick={() => (showProfileOnMobile = !showProfileOnMobile)}
	>
		{showProfileOnMobile ? 'Hide your profile' : 'Show your profile'}
	</button>
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

	h1 {
		margin: 0 0 0.5rem;
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
			padding: 0.75rem 0.75rem 4.5rem;
		}

		.chat-col {
			order: 1;
		}

		.profile-col {
			order: 2;
			position: static;
			max-height: none;
			display: none;
		}

		.profile-col.open {
			display: block;
		}

		.bubble {
			max-width: 100%;
		}

		.profile-toggle {
			display: block;
			position: fixed;
			left: 0.75rem;
			right: 0.75rem;
			bottom: 0.75rem;
			z-index: 10;
			align-self: auto;
			padding: 0.75rem 1rem;
			text-align: center;
		}
	}
</style>
