export const BACKGROUND_METRICS_GREETING = `
The user just finished talking about their motivations and goals.
 Now we want to understand their training background. Look at what sport they are
  interested in, look at their goals and motivations, look at their age. Do they seem like beginners 
  or seasoned someone who has done this a lot before. Make some educated guesses about their possible background and
  then ask a provocative questions to get more information. Use your personality. 
  Use your personality, but don't introduce yourself — 
  introduction is already done. Keep the question short and open ended.`;

export const BACKGROUND_METRICS_PROMPTS = {
  followUp: [
    `The user answered your first open ended question about their background and it's been
     assessed. Look at the followUp field to see
      what information we still need, then ask another open ended question 
      to get this information. Don't tell the user about the assessment. If you read the userprofile
      you could try to see from the previous phase, goals and motivations we can try to 
      make some assumptions about their background in the selected sport. We also wanna formulate a question that is
      relevant for the sport they selected.  `,

      `The user answered another question. Look at the followUp field and continue 
    gathering what's still missing about their background, performance metrics,
     or injuries. Keep it conversational.`,

    `Last attempt for this phase. 
    If we still have gaps, say we can revisit it later
     and we're moving on.`,
  ],
  done: `With your personality, tell the user we now have a solid picture of their background and we're ready to move on.`,
} as const;

export const ASSESSMENT_PROMPT = `You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Capture ANY relevant data the user mentions that you think fits into a field in the user data.
Never discard information. Keep all existing profile values unless the user explicitly corrects them.

This phase is ONLY responsible for the trainingBackground, performanceMetrics, and injuries fields.
For the followUp field: return either null or a comma-separated list of missing field keys from [trainingBackground, performanceMetrics, injuries].
Use exact field keys only, no extra prose. Example: "trainingBackground,injuries".
If no fields are missing, set followUp to null.
"No" or "nothing" are valid answers to injuries — in that case store ["none reported"] and do NOT include injuries in followUp.

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
