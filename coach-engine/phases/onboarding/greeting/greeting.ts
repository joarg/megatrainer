import { callOllama } from '../../../services/ollama.service.js';
import type { OllamaInput } from '../../../types/types.js';
import { GREETING_PROMPT } from './instructions_greeting.js';

/**
 * Generates the trainer's opening greeting once at trainer-creation time.
 * The result is stored in the DB and sent to the frontend before the
 * conversation begins — it is NOT part of the runtime phase loop.
 */
export async function generateGreeting(input: OllamaInput): Promise<string> {
	const response = await callOllama({
		personality: input.personality,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		prompt: GREETING_PROMPT,
		userMessage: '',
		lastAssistantMessage: input.lastAssistantMessage,
	});
	return response.content;
}
