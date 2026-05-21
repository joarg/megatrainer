import { callOllamaPhase } from '../../services/ollama.service.js';
import type { TurnInput } from '../../types/types.js';
import {
	MANAGER_ANSWER_PROMPT,
	MANAGER_PERSONALITY,
	TRAINER_HANDOVER_PROMPT,
	TRAINER_RESUME_PROMPT,
} from '../onboarding/instructions_handle_qs_and_comments.js';

/**
 * Handles a mid-interview Q&A detour inline.
 * Emits three messages directly: trainer handover, manager answer, trainer resume.
 * Returns the resume message text so the caller can include it in the turn's message log.
 */
export async function handleQAndA(pendingQuestions: string[], input: TurnInput): Promise<string> {
	const questionsText = pendingQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');

	const handoverResult = await callOllamaPhase({
		personality: input.personality,
		prompt: TRAINER_HANDOVER_PROMPT,
		userMessage: questionsText,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		lastAssistantMessage: input.lastAssistantMessage,
		phaseCalled: 'qanda-handover',
		phaseAttemptNumber: input.phaseAttempts,
	});
	input.emit?.({ role: 'assistant', text: handoverResult.content });

	const managerResult = await callOllamaPhase({
		personality: MANAGER_PERSONALITY,
		prompt: MANAGER_ANSWER_PROMPT,
		userMessage: questionsText,
		selectedSport: input.selectedSport,
		phaseCalled: 'qanda-manager',
		phaseAttemptNumber: input.phaseAttempts,
	});
	input.emit?.({ role: 'manager', text: managerResult.content });

	const resumeResult = await callOllamaPhase({
		personality: input.personality,
		prompt: TRAINER_RESUME_PROMPT,
		userMessage: `The manager just said: "${managerResult.content}"`,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		phaseCalled: 'qanda-resume',
		phaseAttemptNumber: input.phaseAttempts,
	});
	input.emit?.({ role: 'assistant', text: resumeResult.content });

	return resumeResult.content;
}
