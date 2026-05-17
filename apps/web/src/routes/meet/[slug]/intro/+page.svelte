<script lang="ts">
	import { treaty } from '@elysiajs/eden';
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import type { App } from '../../../../../../api/src/index';

	const api = treaty<App>('http://localhost:3000');

	const PHASE_LABELS: Record<string, string> = {
		basicInfo: 'Basic Info',
		backgroundAndMetrics: 'Background & Metrics',
		motivationsAndGoals: 'Motivations & Goals',
	};

	type ConversationMessage = {
		id: number;
		role: 'assistant' | 'user' | 'manager';
		text: string;
	};

	type OllamaLogEntry = {
		phaseCalled: string;
		phaseAttemptNumber: number;
		timestamp: string;
		request: { prompt: string; userMessage: string };
		response: string;
	};

	let { data }: PageProps = $props();

	const getInitialTrainerReply = () => data.session?.lastAssistantMessage ?? '';

	let userMessage = $state('');
	let messageCounter = $state(1);
	let conversation = $state<ConversationMessage[]>(
		getInitialTrainerReply()
			? [{ id: 0, role: 'assistant', text: getInitialTrainerReply() }]
			: []
	);
	let sendStatus = $state('');
	let isSending = $state(false);
	let ollamaLog = $state<OllamaLogEntry[]>([]);

	let currentPhase = $state(untrack(() => data.session?.phase ?? 'basicInfo'));
	let currentAttempts = $state(untrack(() => data.session?.phaseAttempts ?? 0));
	let currentProfile = $state<Record<string, unknown> | null>(
		untrack(() => (data.session?.userprofile as Record<string, unknown>) ?? null)
	);
	let onboardingComplete = $state(false);

	// On first navigation to this page the session creation passes initial messages
	// (greeting + basicInfo first question) via history state. Override the single
	// lastAssistantMessage from SSR with the full array once the client mounts.
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

	function getPhaseLabel(phase: string) {
		return PHASE_LABELS[phase] ?? phase;
	}

	function appendOllamaLog(entries: OllamaLogEntry[] | undefined) {
		if (!entries || entries.length === 0) return;
		ollamaLog = [...ollamaLog, ...entries];
	}

	async function onMessageSubmit(event: SubmitEvent) {
		event.preventDefault();

		const trimmedMessage = userMessage.trim();
		if (!trimmedMessage || isSending) return;

		conversation = [...conversation, { id: messageCounter, role: 'user', text: trimmedMessage }];
		messageCounter += 1;
		isSending = true;
		sendStatus = 'Sending...';

		const startedAt = Date.now();
		const url = `http://localhost:3000/trainers/${data.slug}/onboarding/sessions/${data.session.id}/message/stream`;
		const response = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: trimmedMessage }),
		});

		if (!response.ok || !response.body) {
			console.error('Failed to send onboarding message', response.status);
			sendStatus = 'Failed to send message';
			isSending = false;
			return;
		}

		const prevPhase = currentPhase;
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const parts = buffer.split('\n\n');
			buffer = parts.pop() ?? '';

			for (const part of parts) {
				const eventLine = part.match(/^event: (\w+)/m);
				const dataLine = part.match(/^data: (.+)/m);
				if (!eventLine || !dataLine) continue;

				const eventType = eventLine[1];
				const payload = JSON.parse(dataLine[1]);

				if (eventType === 'message') {
					conversation = [...conversation, { id: messageCounter++, role: payload.role, text: payload.text }];
				} else if (eventType === 'done') {
					currentPhase = payload.phase ?? currentPhase;
					currentAttempts = payload.phaseAttempts ?? currentAttempts;
					currentProfile = payload.userprofile ?? currentProfile;
					appendOllamaLog(payload.ollamaLog);
					if (payload.complete) onboardingComplete = true;
				}
			}
		}

		if (prevPhase !== currentPhase) {
			conversation = [
				...conversation,
				{
					id: messageCounter++,
					role: 'assistant',
					text: `[System] Phase transition: ${getPhaseLabel(prevPhase)} -> ${getPhaseLabel(currentPhase)}`,
				},
			];
		}

		sendStatus = `Message sent in ${Date.now() - startedAt} ms`;
		userMessage = '';
		isSending = false;
	}
</script>

<div class="layout">
	<div class="chat-col">
		<h1>Onboarding</h1>

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

		{#if onboardingComplete}
			<div class="complete-banner">
				<strong>Onboarding complete!</strong> Your profile is all set. Your trainer will be in touch shortly.
			</div>
		{:else}
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
		{/if}

		{#if sendStatus}
			<p class="send-status">{sendStatus}</p>
		{/if}
	</div>

	<aside class="debug-col">
		<h2>Debug Panel</h2>

		<section class="debug-section">
			<h3>User Profile</h3>
			<pre class="raw">{JSON.stringify(currentProfile, null, 2)}</pre>
		</section>

		<section class="debug-section">
			<h3>Ollama Log ({ollamaLog.length})</h3>
			{#if ollamaLog.length === 0}
				<p class="followup-text">No Ollama calls logged yet.</p>
			{:else}
				{#each [...ollamaLog].reverse() as entry, i}
					<div class="log-entry">
						<div class="log-meta">[{ollamaLog.length - i}] {entry.phaseCalled} | attempt {entry.phaseAttemptNumber} | {new Date(entry.timestamp).toLocaleTimeString()}</div>
						<pre class="raw">{JSON.stringify(entry, null, 2)}</pre>
					</div>
				{/each}
			{/if}
		</section>
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
		background: #f1f5f9;
	}

	.bubble.user {
		background: #e2e8f0;
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
		padding: 0.5rem;
		font-size: 1rem;
		border: 1px solid #cbd5e1;
		border-radius: 0.375rem;
	}

	button {
		padding: 0.5rem 1rem;
		align-self: flex-start;
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

	.debug-col {
		position: sticky;
		top: 1rem;
		background: #0f172a;
		color: #e2e8f0;
		border-radius: 0.5rem;
		padding: 1rem;
		font-size: 0.8rem;
		overflow-y: auto;
		max-height: calc(100vh - 2rem);
	}

	.debug-col h2 {
		margin: 0 0 0.75rem;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #94a3b8;
	}

	.debug-section {
		margin-bottom: 1rem;
		border-top: 1px solid #1e293b;
		padding-top: 0.6rem;
	}

	.debug-section h3 {
		margin: 0 0 0.4rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.log-entry {
		margin-bottom: 0.75rem;
		border-left: 2px solid #1e293b;
		padding-left: 0.5rem;
	}

	.log-meta {
		color: #7dd3fc;
		font-size: 0.7rem;
		margin-bottom: 0.25rem;
	}

	.followup-text {
		margin: 0;
		color: #fbbf24;
		font-style: italic;
	}

	.raw {
		margin: 0;
		font-size: 0.7rem;
		color: #64748b;
		white-space: pre-wrap;
		word-break: break-all;
		line-height: 1.4;
	}
</style>