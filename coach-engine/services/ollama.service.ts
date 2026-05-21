export type OllamaMessage = {
  role: string;
  content: string;
  thinking?: string;
};

type OllamaChatResponse = {
  message: OllamaMessage;
};

const ollamaLog: OllamaLogEntry[] = [];

function addToLog(input: OllamaPhaseInput, response: OllamaChatResponse): void {
  ollamaLog.push({
    phaseCalled: input.phaseCalled ?? 'unknown',
    phaseAttemptNumber: input.phaseAttemptNumber ?? 0,
    timestamp: new Date().toISOString(),
    request: { prompt: input.prompt, userMessage: input.userMessage, lastAssistantMessage: input.lastAssistantMessage },
    response: response.message.content,
    thinking: response.message.thinking,
  });
}

export function takeOllamaLog(): OllamaLogEntry[] {
  return ollamaLog.splice(0);
}

import type { OllamaLogEntry, OllamaPhaseInput } from '../types/types.js';
import { MODEL, OLLAMA_ENDPOINT, SYSTEM_INSTRUCTION } from '../config.js';

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

function buildSystemPrompt(input: OllamaPhaseInput) {
  const parts = [
    `<|think|>\n${SYSTEM_INSTRUCTION}`,
    `personality: ${input.personality}`,
    input.trainerName
      ? `trainerName: ${input.trainerName}\nKeep this exact trainer name in all responses. Never invent or change your name.`
      : null,
    `phasemission: ${input.prompt}`,
    input.selectedSport ? `selectedSport: ${input.selectedSport}` : null,
  ].filter((part): part is string => Boolean(part));

  if (input.currentUserInfo) {
    parts.push(`accumulatedUserInfo: ${input.currentUserInfo}`);
  }

  return parts.join("\n\n");
}

export async function callOllamaPhase(input: OllamaPhaseInput) {
  const systemPrompt = buildSystemPrompt(input);
  const endpoint = `${OLLAMA_ENDPOINT}/api/chat`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        ...(input.lastAssistantMessage
          ? [{ role: "assistant", content: input.lastAssistantMessage }]
          : []),
        { role: "user", content: input.userMessage },
      ],
    }),
  });

  const data = (await response.json()) as OllamaChatResponse;
  addToLog(input, data);
  return data.message;
}