export const ASSESSMENT_PROMPT = `You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Capture ANY relevant data the user mentions that you think fits into a field in the user data.
Never discard information. Keep all existing profile values unless the user explicitly corrects them.

This phase is responsible for understanding what equipment or facilities the user has access to, and how much time per week they can dedicate to training.
Store this information in the trainingBackground field (e.g. "home gym", "commercial gym", "3 days per week").
Set followUp to null if we have a clear picture of their available equipment and time commitment. Otherwise describe what is still missing.

If the user has any questions then add it to pendingQsAndComments with a note that it is a user question. Rephrase it so that its correct and complete in its form.
Return the FULL profile JSON with these exact keys:
{
  "name": string|null,
  "age": number|null,
  "gender": string|null,
  "genderNotes": string,
  "location": string|null,
  "country": string|null,
  "trainingBackground": string[],
  "performanceMetrics": string[],
  "injuries": string[],
  "motivations": string[],
  "goals": string[],
  "pendingQsAndComments": string[],
  "followUp": string|null
}`;

export const TOOLS_AND_TIME_GREETING = `The user has just finished sharing their training background and metrics. Now we want to understand their setup — what equipment or facilities they have access to, and how much time per week they can dedicate to training. Use your personality, keep it short and open ended.`;

export const TOOLS_AND_TIME_PROMPTS = {
	followUp: [
		`Look at the followUp field in the user profile — it contains exactly what we still need to know about their equipment and available time. Ask only about what is described in followUp. Keep it conversational and in character.`,
		`The user has given us more info. Look again at the followUp field. If there are still missing pieces about their tools or available time, ask about those with your personality.`,
		`Last attempt for this phase. If we still don't have a clear picture, say we can revisit it later and move on.`,
	],
	done: `With your personality, let the user know we now have a good idea of their setup and available time. We're ready to build their plan.`,
} as const;
