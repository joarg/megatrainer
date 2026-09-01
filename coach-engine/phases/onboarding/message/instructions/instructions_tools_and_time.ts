export const INTRODUCTION_PROMPT = `
The user just finished the last phase, which was where we asked about their training background and performance metrics. That phase is now completed (we dont know if it was successful or not, check the userprofile to see.
Lets tell the user that we are now going to ask them about what equipment or facilities they have access to, and how much time per week they can dedicate to training.`


export const ASSESSMENT_PROMPT = `You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Never discard information. Keep all existing profile values unless the user explicitly corrects them.

This phase is ONLY responsible for the equipmentAndSchedule field: understanding what equipment or facilities the user has access to, and how much time per week they can dedicate to training.
Store this information in the equipmentAndSchedule field (e.g. "home gym", "commercial gym", "3 days per week").
Set followUp to null if we have a clear picture of their available equipment and time commitment. Otherwise describe what is still missing.

OUT-OF-SCOPE INFO: If the user's message contains other genuinely new information that belongs to a different phase (e.g. training history, performance numbers, injuries, motivations, goals) — do NOT guess which specific field it belongs to, and do NOT write it into trainingBackground, performanceMetrics, injuries, motivations, or goals yourself. Instead, copy the relevant detail (lightly cleaned up, one topic per entry) as a new item into unclassifiedNotes. A dedicated later step will route each note to the correct field.

IMPORTANT: The previous message shown to you (role "assistant") is YOUR OWN prior question to the user, not something the user asked. Never copy or paraphrase it into pendingQsAndComments. Only add to pendingQsAndComments if the user's own latest message itself contains a genuine question or comment directed at you.
If the user has any questions then add it to pendingQsAndComments with a note that it is a user question. Rephrase it so that its correct and complete in its form.
NEVER add internal observations, missing-field notes, or follow-up reminders to pendingQsAndComments — use the followUp field for those.
pendingQsAndComments is ONLY for questions the user themselves asked.
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
  "equipmentAndSchedule": string[],
  "pendingQsAndComments": string[],
  "unclassifiedNotes": string[],
  "followUp": string|null
}`;

export const TOOLS_AND_TIME_PROMPTS = [
		`Look at the followUp field in the user profile — it contains exactly what we still need to know about their equipment and available time. Ask only about what is described in followUp. Keep it conversational and in character.`,
		`The user has given us more info. Look again at the followUp field. If there are still missing pieces about their tools or available time, ask about those with your personality.`,
		`Last attempt for this phase. If we still don't have a clear picture, say we can revisit it later and move on.`,
	]
