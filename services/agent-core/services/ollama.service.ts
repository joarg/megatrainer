export type OllamaMessage = {
  role: string;
  content: string;
  thinking?: string;
};

type OllamaChatResponse = {
  message: OllamaMessage;
};

export type CommonPhaseInput = {
  model: string;
  systemInstruction: string;
  personality: string;
  phasemission: string;
  selectedSport: string;
  userMessage: string;
  currentUserInfo?: string;
  endpoint?: string;
};

export type FollowUpPhaseInput = CommonPhaseInput & {
  validationMessage: string;
};

export type PhaseInput = CommonPhaseInput | FollowUpPhaseInput;

export function parseJsonFromModelContent(content: string) {
  const trimmed = content.trim();

  // Accept optional markdown code fences around JSON.
  const fencedJsonMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonString = fencedJsonMatch ? fencedJsonMatch[1].trim() : trimmed;

  return JSON.parse(jsonString);
}

function buildSystemPrompt(input: PhaseInput) {
  const parts = [
    input.systemInstruction,
    `personality: ${input.personality}`,
    `phasemission: ${input.phasemission}`,
    `selectedSport: ${input.selectedSport}`,
  ];

  if ("validationMessage" in input) {
    parts.push(`validationMessage: ${input.validationMessage}`);
  }

  if (input.currentUserInfo) {
    parts.push(`accumulatedUserInfo: ${input.currentUserInfo}`);
  }

  return parts.join("\n\n");
}

export async function callOllamaPhase(input: PhaseInput) {
  const systemPrompt = buildSystemPrompt(input);
  const endpoint = input.endpoint ?? "http://127.0.0.1:11434/api/chat";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input.userMessage },
      ],
    }),
  });

  const data = (await response.json()) as OllamaChatResponse;
  return data.message;
}