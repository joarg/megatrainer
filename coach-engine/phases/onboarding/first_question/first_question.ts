import { callOllama, OllamaMessage } from '../../../services/ollama.service.js';
import type { OllamaInput } from '../../../types/types.js';
import { FIRST_QUESTION_PROMPT } from './instructions_first_question.js';

	
export async function generateFirstQuestion(input: OllamaInput): Promise<OllamaMessage> {
	const response = await callOllama({
		personality: input.personality,
		trainerName: input.trainerName,
		selectedSport: input.selectedSport,
		prompt: FIRST_QUESTION_PROMPT,
		userMessage: '',
		lastAssistantMessage: input.lastAssistantMessage,
	});
	return response;
}
