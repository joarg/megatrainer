/**
 * UI chrome strings, in the language the trainer speaks.
 *
 * This exists because a trainer can be created in any language, and their generated
 * panel copy, greeting and questions all honour that — but the surrounding interface
 * ("Your profile", "Onboarding complete", "Send") was hardcoded English, so a
 * Norwegian coach was surrounded by Norwegian text with English buttons. Generated
 * copy can't cover this: it is product chrome, not persona copy, and it must be
 * deterministic so the layout never shifts or renders a half-translated sentence.
 *
 * Deliberately small and hand-written rather than an i18n framework: the set of
 * strings is fixed and small, and every extra language is one more object literal.
 * Anything not listed falls back to English, matching how the rest of the app treats
 * an unset trainer language.
 */

export type UiStrings = {
	yourProfile: string;
	onboardingComplete: string;
	onboarding: string;
	stepOf: (step: number, total: number) => string;
	stepOfLabel: (step: number, total: number, label: string) => string;
	logged: (count: number) => string;
	inProgress: string;
	complete: string;
	movedOnMissing: string;
	evaluatingInput: string;
	awaitingInfo: string;
	newDetails: (count: number) => string;
	viewProfile: string;
	collapseProfile: string;
	yourMessage: string;
	typeYourMessage: string;
	send: string;
	debugRawProfile: string;
	requestSummary: string;
	asksFor: string;
	speakerYou: string;
	speakerManager: string;
	isReading: string;
	isThinking: string;
	isTyping: string;
};

const EN: UiStrings = {
	yourProfile: 'Your profile',
	onboardingComplete: 'Onboarding complete',
	onboarding: 'Onboarding',
	stepOf: (step, total) => `Step ${step} of ${total}`,
	stepOfLabel: (step, total, label) => `Step ${step} of ${total}: ${label}`,
	logged: (count) => `+${count} logged`,
	inProgress: 'In progress',
	complete: 'Complete',
	movedOnMissing: 'Moved on — some details missing',
	evaluatingInput: 'Evaluating input',
	awaitingInfo: 'Awaiting info',
	newDetails: (count) =>
		`${count} new detail${count === 1 ? '' : 's'} added to your profile`,
	viewProfile: 'View profile',
	collapseProfile: 'Collapse profile',
	yourMessage: 'Your message',
	typeYourMessage: 'Type your message...',
	send: 'Send',
	debugRawProfile: 'Debug: raw profile',
	requestSummary: 'Trainer request summary',
	asksFor: 'asks for',
	speakerYou: 'You',
	speakerManager: 'Manager',
	isReading: 'is reading',
	isThinking: 'is thinking',
	isTyping: 'is typing',
};

const NO: UiStrings = {
	yourProfile: 'Profilen din',
	onboardingComplete: 'Onboarding fullført',
	onboarding: 'Onboarding',
	stepOf: (step, total) => `Steg ${step} av ${total}`,
	stepOfLabel: (step, total, label) => `Steg ${step} av ${total}: ${label}`,
	logged: (count) => `+${count} lagret`,
	inProgress: 'Pågår',
	complete: 'Fullført',
	movedOnMissing: 'Gikk videre — noen detaljer mangler',
	evaluatingInput: 'Vurderer svaret',
	awaitingInfo: 'Venter på svar',
	newDetails: (count) =>
		`${count} ny${count === 1 ? ' detalj' : 'e detaljer'} lagt til i profilen din`,
	viewProfile: 'Vis profil',
	collapseProfile: 'Skjul profil',
	yourMessage: 'Meldingen din',
	typeYourMessage: 'Skriv meldingen din...',
	send: 'Send',
	debugRawProfile: 'Feilsøking: rå profil',
	requestSummary: 'Oppsummering av trenerens forespørsel',
	asksFor: 'ber om',
	speakerYou: 'Du',
	speakerManager: 'Leder',
	isReading: 'leser',
	isThinking: 'tenker',
	isTyping: 'skriver',
};

const BY_LANGUAGE: Record<string, UiStrings> = {
	no: NO,
	nb: NO,
	nn: NO,
	norwegian: NO,
	norsk: NO,
	bokmal: NO,
	// Same word with the ring — a very natural way to type it, and easy to miss.
	'bokmål': NO,
};

/**
 * Resolve UI strings for a trainer's free-text `language` field ("Norwegian", "no",
 * "Norsk"). Anything unrecognised — including the empty default, which means English
 * throughout the rest of the app — falls back to English.
 */
export function uiStrings(language: string | null | undefined): UiStrings {
	const normalized = (language ?? '').trim().toLowerCase();
	if (!normalized) return EN;
	if (BY_LANGUAGE[normalized]) return BY_LANGUAGE[normalized];
	// "Norwegian (Bokmål)", "no-NO" and similar: match on the first token.
	const head = normalized.split(/[\s,()_-]/)[0];
	return BY_LANGUAGE[head] ?? EN;
}
