export const ASSESSMENT_PROMPT = `You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Capture ANY relevant data the user mentions that you think fits into a field in the user data.
Never discard information. Keep all existing profile values unless the user explicitly corrects them.

This phase is ONLY responsible for the name, age, and location fields.
For the followUp field: return either null or a comma-separated list of missing field keys from [name, age, location].
Use exact field keys only, no extra prose. Example: "name,age".
If no fields are missing, set followUp to null.

EQUIPMENT & SCHEDULE: If the user mentions what equipment/facilities they have access to (e.g. "home gym", "commercial gym", "outdoor court") or how much time/how many days per week they can train — even in passing, and even though that's not this phase's focus — capture it into the trainingBackground field right away (e.g. "home gym", "3 days per week") so it isn't lost. A later phase will still confirm and fill in any gaps.

For gender: Use location of the user to make a guess on what gender the name is likely to be on this location. Take some chances. Always populate genderNotes with your reasoning.

IMPORTANT: The previous message shown to you (role "assistant") is YOUR OWN prior question to the user, not something the user asked. Never copy or paraphrase it into pendingQsAndComments. Only add to pendingQsAndComments if the user's own latest message itself contains a genuine question or comment directed at you.
If the user has any questions then add it to pendingQsAndComments with a note that it is a user question. Rephrase it so that its correct and complete in its form.
Return the FULL profile JSON with these exact keys, remember to set the followUp field to null if the profile is complete. 
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

export const PROMPTS = [
  `We just started the onboarding process. The "lastAssistantMessage" shows the question we asked the user
    and the the user has given us a response. We have had the response assessed (the user doesnt have to know about the assessment).
    But if you look at the followUp field in the user profile, it contains exactly what we still need to know about their basic info.
    Ask only about what is described in followUp. Keep it conversational and in character. If user has provided gender, age location, 
    then adjust your communication style to this type of user. 
    `,

  `The user still has missing basic info. Acknowledge it and ask
     in a softer way. Mention it is optional.`,

  `This is the last attempt for basic info. If fields are still missing, 
    say we can continue and fill it later, then transition to next phase.`,
]
