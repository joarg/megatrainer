import { callOllama } from '../../../services/ollama.service.js';
import type { OllamaMessage } from '../../../services/ollama.service.js';
import type { GenerationInput } from '../../../types/types.js';
import { FIRST_QUESTION_PROMPT } from './instructions_first_question.js';

	
export async function generateFirstQuestion(input: GenerationInput): Promise<OllamaMessage> {
	const response = await callOllama({
		personality: input.personality,
		trainerName: input.trainerName,
		language: input.language,
		selectedSport: input.selectedSport,
		prompt: FIRST_QUESTION_PROMPT,
		userMessage: '',
		lastAssistantMessage: input.lastAssistantMessage,
	});
	return response;
}
