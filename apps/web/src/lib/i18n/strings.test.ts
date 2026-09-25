import { describe, expect, test } from 'bun:test';
import { uiStrings } from './strings';

describe('uiStrings', () => {
	test('falls back to English when the trainer has no language', () => {
		// An unset language means English everywhere else in the app, so the chrome
		// must not silently become Norwegian (or anything else).
		for (const value of ['', '   ', null, undefined]) {
			expect(uiStrings(value).yourProfile).toBe('Your profile');
			expect(uiStrings(value).onboardingComplete).toBe('Onboarding complete');
		}
	});

	test('resolves Norwegian however the trainer spelled it', () => {
		// `language` is a free-text field, so a real user may write it several ways.
		for (const value of ['Norwegian', 'norwegian', 'Norsk', 'no', 'NO', 'nb', 'Bokmål']) {
			expect(uiStrings(value).yourProfile).toBe('Profilen din');
		}
	});

	test('matches on the first token for tagged or annotated languages', () => {
		expect(uiStrings('Norwegian (Bokmål)').onboardingComplete).toBe('Onboarding fullført');
		expect(uiStrings('no-NO').send).toBe('Send');
	});

	test('falls back to English for an unsupported language rather than showing Norwegian', () => {
		expect(uiStrings('Spanish').yourProfile).toBe('Your profile');
		expect(uiStrings('Klingon').onboardingComplete).toBe('Onboarding complete');
	});

	test('pluralises the new-detail announcement per language', () => {
		const en = uiStrings('English');
		expect(en.newDetails(1)).toBe('1 new detail added to your profile');
		expect(en.newDetails(3)).toBe('3 new details added to your profile');

		const no = uiStrings('Norwegian');
		expect(no.newDetails(1)).toBe('1 ny detalj lagt til i profilen din');
		expect(no.newDetails(3)).toBe('3 nye detaljer lagt til i profilen din');
	});

	test('every Norwegian string is actually translated', () => {
		// Guards against a partially filled Norwegian object leaking English through,
		// which is exactly the bug this module exists to fix.
		// "Onboarding" and "Send" are genuine Norwegian loanwords — identical spelling
		// is correct, not an oversight, so they are allowlisted rather than forced
		// into a stilted translation.
		const identicalInBoth = new Set<keyof ReturnType<typeof uiStrings>>([
			'onboarding',
			'send',
		]);
		const en = uiStrings('English');
		const no = uiStrings('Norwegian');
		for (const key of Object.keys(en) as (keyof typeof en)[]) {
			if (typeof en[key] === 'function') continue;
			if (identicalInBoth.has(key)) continue;
			expect(no[key]).not.toBe(en[key]);
		}
	});
});
