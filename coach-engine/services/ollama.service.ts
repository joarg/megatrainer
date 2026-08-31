export type OllamaMessage = {
  role: string;
  content: string;
  thinking?: string;
};


import type {  OllamaInput } from '../types/types.js';
import {MODEL_GOOGLE,  MODEL_GOOGLE2,  MODEL_HEAVY, MODEL_LIGHT, OLLAMA_ENDPOINT, SYSTEM_INSTRUCTION } from '../config.js';

export function parseJsonFromModelContent(content: string) {
  let text = content.trim();

  // Strip gemma4-style inline thinking blocks that may bleed into content.
  text = text.replace(/<\|channel>thought\n[\s\S]*?<channel\|>/g, '').trim();

  // Extract content from a markdown code fence if present (anywhere in the text).
  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : text;

  // Fast path: the candidate is already valid JSON.
  try {
    return JSON.parse(candidate);
  } catch {
    // Fallback: find the first top-level JSON object or array in the text.
    const jsonMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new SyntaxError(`No valid JSON found in model response: ${content.slice(0, 120)}`);
  }
}

function buildSystemPrompt(input: OllamaInput): string {
  return [
    `<|think|>\n${SYSTEM_INSTRUCTION}`,
    `personality: ${input.personality}`,
    input.trainerName && `trainerName: ${input.trainerName}\nKeep this exact trainer name in all responses. Never invent or change your name.`,
    `instructions: ${input.prompt}`,
    input.selectedSport?.length && `selectedSport: ${input.selectedSport.join(', ')}`,  
    input.currentUserProfile && `currentUserProfile: ${JSON.stringify(input.currentUserProfile, null, 2)}`,
  ]
    // && produces `false` for missing optional fields — filter removes those,
    // then join separates each section with a blank line for the model to parse clearly.
    .filter((s): s is string => Boolean(s))
    .join('\n\n');
}

export async function callOllama(input: OllamaInput) {
  const systemPrompt = buildSystemPrompt(input);
  const endpoint = `${OLLAMA_ENDPOINT}/api/chat`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL_GOOGLE2,
      stream: false,
      think: false,
      messages: [
        { role: "system", content: systemPrompt },
        ...(input.lastAssistantMessage
          ? [{ role: "assistant", content: input.lastAssistantMessage }]
          : []),
        ...(input.userMessage
          ? [{ role: "user", content: input.userMessage }]
          : []),
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const { message } = await response.json() as { message: OllamaMessage };
  return message;
}