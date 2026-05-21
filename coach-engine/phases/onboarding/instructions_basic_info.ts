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

For gender: infer from name when reasonably clear. Always populate genderNotes with your reasoning.

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

export const BASIC_INFO_PROMPTS = {
  followUp: [
    `We just started the onboarding process. The "lastAssistantMessage" contains an initial introduction that we sent to the user
    now its your job to continue the conversation from that last
     Assistant message and bridge the conversation with a short sentence into asking for name, age and location. 
Ignore the last user input, this was not done by the user but as a
     way to start the conversation. Ask for three things only here, name age and location.  

    `,

    `The user still has missing basic info. Acknowledge it and ask
     in a softer way. Mention it is optional.`,

    `This is the last attempt for basic info. If fields are still missing, 
    say we can continue and fill it later, then transition to next phase.`,
  ],
  done: `With your personality, let the user know we have everything we need for now and we're ready to move on.`,
} as const;
