<script lang="ts">
	/**
	 * User-facing view of the profile the trainer is building during onboarding.
	 * Three jobs: show what has already been captured (with a flash when something
	 * new lands, so the user sees their answer being "logged"), show which phases
	 * are done / current / still coming so the flow feels finite, and make the
	 * captured details easy to review.
	 */
	import { untrack } from 'svelte';
	import {
		isProfileValueFilled,
		phasesWithCopy,
		PROFILE_PHASES,
		type PanelCopy,
		type Profile,
		type ProfileValue,
		type OnboardingPhase,
	} from '$lib/onboarding/profile';
	import { uiStrings } from '$lib/i18n/strings';

	let {
		profile = null,
		phase = 'basicInfo',
		complete = false,
		copy = null,
		awaitingReply = false,
		language = null,
	}: {
		profile?: Profile;
		phase?: string;
		complete?: boolean;
		copy?: PanelCopy | null;
		awaitingReply?: boolean;
		// The trainer's free-text language, so this panel's own chrome ("Your profile",
		// "Complete") matches the language their generated copy is already in. Optional,
		// and defaults to English — which is what an unset trainer language means.
		language?: string | null;
	} = $props();

	// Product chrome, translated deterministically. The phase/field wording comes from
	// the trainer's generated copy instead (see phasesWithCopy below); only the
	// surrounding labels are looked up here.
	const t = $derived(uiStrings(language));

	// Overlay the trainer's wording onto the structural phase table, matched by key.
	// Anything missing (no copy at all, an unknown key, a blank string) keeps the
	// English default, so a partial or absent generation degrades one label at a time
	// instead of emptying the panel.
	const phases = $derived.by((): OnboardingPhase[] => phasesWithCopy(copy));

	const ALL_FIELDS = PROFILE_PHASES.flatMap((p) => p.fields);

	function display(value: ProfileValue): string {
		if (Array.isArray(value)) return value.filter((v) => typeof v !== 'string' || v.trim().length > 0).join(' · ');
		return String(value);
	}

	// Snapshot of which fields were filled the last time we rendered, so a change can be
	// highlighted. Deliberately NOT reactive: it is read and written inside the same
	// $effect, which would otherwise make the effect invalidate itself in a loop.
	let previouslyFilled = new Set<string>();
	let justAdded = $state<Set<string>>(new Set());
	let flashToken = $state(0);
	let highlightTimer: ReturnType<typeof setTimeout> | undefined;

	const filledKeys = $derived(
		new Set(ALL_FIELDS.filter((f) => isProfileValueFilled(profile?.[f.key])).map((f) => f.key)),
	);
	const phaseIndex = $derived(Math.max(0, PROFILE_PHASES.findIndex((p) => p.key === phase)));

	// Which phase's questions/answers are expanded. Defaults to whatever phase is
	// currently active; the user may expand any other phase to review past answers.
	let expandedKey = $state<string>(untrack(() => phase));
	// Non-reactive bookkeeping to detect an actual step *transition* (vs. a re-render).
	// A "step" is phase + completion: onboarding finishing doesn't change `phase` (it
	// stays on the last phase) but should still trigger the same reveal behavior, so
	// completion is folded into the key rather than tracked separately.
	function stepKey(p: string, done: boolean) {
		return `${p}:${done}`;
	}
	let lastSeenStep = untrack(() => stepKey(phase, complete));

	$effect(() => {
		const added = [...filledKeys].filter((key) => !previouslyFilled.has(key));
		previouslyFilled = new Set(filledKeys);
		if (added.length === 0) return;

		justAdded = new Set(added);
		flashToken += 1;
		clearTimeout(highlightTimer);
		highlightTimer = setTimeout(() => {
			justAdded = new Set();
		}, 2600);
	});

	$effect(() => () => clearTimeout(highlightTimer));

	// When the phase actually advances, keep the *previous* phase expanded for a beat so
	// the user sees what was just captured there (a small pause-filler instead of a blank
	// wait), then slide open the new current phase. Everything the timeout needs (the
	// target phase) is captured in local consts up front rather than re-read from the
	// `phase` prop later, and the effect's own cleanup cancels the timer — so a second
	// transition arriving before the first one fires can never leave a stale/no-op timer
	// around or race with a newer one.
	// When the phase actually advances (or onboarding completes), keep the *previous*
	// phase expanded for a beat so the user sees what was just captured there (a small
	// pause-filler instead of a blank wait), then slide open the new current phase — even
	// if the user had manually expanded a different phase in the meantime, a real
	// transition always takes back control so the newest answers are never hidden.
	// Everything the timeout needs (the target phase) is captured in local consts up
	// front rather than re-read from the `phase` prop later, and the effect's own cleanup
	// cancels the timer — so a second transition arriving before the first one fires can
	// never leave a stale/no-op timer around or race with a newer one.
	$effect(() => {
		const targetPhase = phase;
		const isComplete = complete;
		const step = stepKey(targetPhase, isComplete);
		if (step === lastSeenStep) return;
		lastSeenStep = step;
		// expandedKey is left as-is here (whatever was open before) so the user briefly
		// keeps seeing it, then we swap to the new target phase after the delay below.

		const timer = setTimeout(() => {
			expandedKey = targetPhase;
		}, 1400);
		return () => clearTimeout(timer);
	});

	// A phase is only genuinely 'done' if it actually collected every field it owns.
	// The engine can force-advance past a phase the user never finished answering (see
	// the give-up path in coach-engine/.../message/index.ts), and on completion every
	// phase used to be marked 'done' unconditionally — which rendered "Complete" with a
	// green tick next to a profile whose age and location were still null. 'skipped'
	// reports that honestly: we moved past it, and some of it is missing.
	function phaseStatus(index: number): 'done' | 'skipped' | 'current' | 'upcoming' {
		const phase = phases[index];
		const satisfied = (phase?.fields ?? []).every((f) => filledKeys.has(f.key));
		const behindUs = complete || index < phaseIndex;
		if (behindUs) return satisfied ? 'done' : 'skipped';
		return index === phaseIndex ? 'current' : 'upcoming';
	}

	function toggle(key: string) {
		expandedKey = expandedKey === key ? '' : key;
	}
</script>

<section class="panel" aria-label="Your profile">
	<header class="panel-head">
		<h2>{t.yourProfile}</h2>
		<p class="progress-label">
			{complete ? t.onboardingComplete : t.stepOf(phaseIndex + 1, PROFILE_PHASES.length)}
		</p>
	</header>

	<ol class="outline">
		{#each phases as p, i (p.key)}
			{@const status = phaseStatus(i)}
			{@const isExpanded = expandedKey === p.key}
			{@const addedHere = justAdded.size > 0 && p.fields.some((f) => justAdded.has(f.key))}
			<li class="phase {status}" class:expanded={isExpanded}>
				<button
					type="button"
					class="phase-head"
					aria-expanded={isExpanded}
					aria-controls="phase-panel-{p.key}"
					onclick={() => toggle(p.key)}
				>
					<span class="dot" aria-hidden="true">{status === 'done' ? '✓' : i + 1}</span>
					<span class="phase-text">
						<span class="phase-label">
							{p.label}
							{#if addedHere}
								{#key flashToken}
									<span class="badge">{t.logged(p.fields.filter((f) => justAdded.has(f.key)).length)}</span>
								{/key}
							{/if}
						</span>
						<span class="phase-blurb">
							{status === 'current'
								? t.inProgress
								: status === 'done'
									? t.complete
									: status === 'skipped'
										? t.movedOnMissing
										: p.blurb}
						</span>
					</span>
					<span class="chevron" aria-hidden="true">▾</span>
				</button>

				{#if isExpanded}
					<div class="phase-panel" id="phase-panel-{p.key}">
						<ul class="fields">
							{#each p.fields as field (field.key)}
								{@const filled = filledKeys.has(field.key)}
								{@const wanted = !filled && status === 'current' && !complete}
								<li
									class="field"
									class:filled
									class:wanted
									class:flash={justAdded.has(field.key)}
								>
									<span class="icon" aria-hidden="true">{field.icon}</span>
									<span class="field-body">
										<span class="field-label">{field.label}</span>
										<span class="field-value">
											{filled ? display(profile?.[field.key]) : awaitingReply ? t.evaluatingInput : t.awaitingInfo}
										</span>
									</span>
									{#if filled}<span class="check" aria-hidden="true">✓</span>{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</li>
		{/each}
	</ol>

	<p class="sr-only" aria-live="polite">
		{justAdded.size > 0 ? t.newDetails(justAdded.size) : ''}
	</p>
</section>

<style>
	.panel {
		background: var(--mt-bg-elevated, #111a2c);
		border: 1px solid var(--mt-panel-border, rgba(255, 255, 255, 0.1));
		border-radius: var(--mt-radius, 16px);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	h2 {
		margin: 0;
		font-size: 0.95rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--mt-gold, #f0b429);
	}

	.panel-head {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.progress-label {
		margin: 0;
		font-size: 0.8rem;
		color: var(--mt-text-muted, #94a3b8);
	}

	.outline {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}

	.phase {
		border: 1px solid var(--mt-panel-border, rgba(255, 255, 255, 0.1));
		border-radius: 12px;
		background: var(--mt-panel, rgba(255, 255, 255, 0.05));
		overflow: hidden;
		transition: border-color 300ms ease, opacity 300ms ease;
	}

	.phase.current {
		border-color: rgba(240, 180, 41, 0.45);
	}

	.phase.expanded {
		border-color: rgba(240, 180, 41, 0.55);
	}

	.phase.upcoming {
		opacity: 0.6;
	}

	/* Moved past without collecting every field. Visually distinct from .done: a
	   dashed, muted outline and a number rather than a gold ✓, so an incomplete
	   phase never reads as a finished one. */
	.phase.skipped {
		border-style: dashed;
		border-color: rgba(148, 163, 184, 0.4);
		opacity: 0.85;
	}

	.phase.skipped .dot {
		background: transparent;
		border: 1px dashed rgba(148, 163, 184, 0.65);
		color: var(--mt-text-muted, #94a3b8);
	}

	.phase-head {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.65rem;
		background: transparent;
		border: none;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.phase-head:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.phase.current .phase-head {
		background: var(--mt-gold-soft, rgba(240, 180, 41, 0.16));
	}

	.dot {
		flex: none;
		width: 1.35rem;
		height: 1.35rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 0.7rem;
		font-weight: 700;
		background: rgba(255, 255, 255, 0.08);
		color: var(--mt-text-muted, #94a3b8);
	}

	.phase.done .dot,
	.phase.current .dot {
		background: var(--mt-gold, #f0b429);
		color: #0b1220;
	}

	.phase-text {
		flex: 1 1 auto;
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		min-width: 0;
	}

	.phase-label {
		font-size: 0.8rem;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.phase-blurb {
		font-size: 0.7rem;
		color: var(--mt-text-muted, #94a3b8);
	}

	.chevron {
		flex: none;
		font-size: 0.7rem;
		color: var(--mt-text-muted, #94a3b8);
		transition: transform 250ms ease;
	}

	.phase.expanded .chevron {
		transform: rotate(180deg);
	}

	.phase-panel {
		padding: 0 0.65rem 0.65rem;
		animation: expand 220ms ease-out;
	}

	@keyframes expand {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.badge {
		background: var(--mt-gold, #f0b429);
		color: #0b1220;
		border-radius: 999px;
		padding: 0.1rem 0.45rem;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		animation: pop 2.6s ease forwards;
	}

	.fields {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.4rem;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0.45rem 0.55rem;
		border-radius: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(255, 255, 255, 0.03);
		color: var(--mt-text-muted, #94a3b8);
		min-width: 0;
		transition:
			border-color 400ms ease,
			background 400ms ease,
			color 400ms ease;
	}

	.field.filled {
		border-color: rgba(240, 180, 41, 0.55);
		background: var(--mt-gold-soft, rgba(240, 180, 41, 0.16));
		color: var(--mt-text, #e5e9f0);
	}

	/* A field the trainer is waiting on right now. Deliberately a cooler/steadier
	   treatment than .filled's gold so "still needed" and "already captured" never
	   read as the same state. */
	.field.wanted {
		border-color: rgba(125, 211, 252, 0.5);
		background: rgba(125, 211, 252, 0.08);
		color: var(--mt-text, #e5e9f0);
		animation: wanted-pulse 2.4s ease-in-out infinite;
	}

	.field.flash {
		animation: intel-flash 1.6s ease-out;
	}

	.icon {
		flex: none;
		font-size: 0.85rem;
	}

	.field-body {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.field-label {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.75;
	}

	.field-value {
		font-size: 0.8rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.check {
		margin-left: auto;
		color: var(--mt-gold, #f0b429);
		font-weight: 700;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes intel-flash {
		0% {
			transform: scale(0.96);
			box-shadow: 0 0 0 0 rgba(240, 180, 41, 0);
		}
		25% {
			transform: scale(1.03);
			box-shadow: 0 0 18px 4px rgba(240, 180, 41, 0.55);
		}
		100% {
			transform: scale(1);
			box-shadow: 0 0 0 0 rgba(240, 180, 41, 0);
		}
	}

	@keyframes wanted-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(125, 211, 252, 0);
		}
		50% {
			box-shadow: 0 0 12px 1px rgba(125, 211, 252, 0.35);
		}
	}

	@keyframes pop {
		0% {
			opacity: 0;
			transform: translateY(-4px) scale(0.9);
		}
		12% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		85% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.field.flash,
		.field.wanted,
		.badge,
		.phase-panel {
			animation: none;
		}
		.meter-fill,
		.chevron {
			transition: none;
		}
	}
</style>
