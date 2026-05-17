export const ASSESSMENT_PROMPT = `CRITICAL: Respond with ONLY the JSON object. No prose, no chat, no explanation — just the raw JSON.

You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Capture ANY relevant data the user mentions that you think fits into a field in the user data.
Never discard information. Keep all existing profile values unless the user explicitly corrects them.

We especially want to know about the users motivations and goals for training. These are two distinct concepts:

GOALS are concrete outcomes the user wants to achieve — e.g. "bench press my own bodyweight", "run a 5k", "lose 10kg". 
They should be specific and ideally measurable. Store these in the goals field.
Assess whether the goal can be tracked against performance metrics in the selected sport once those are provided.
If the goal is not measurable, note in followUp what is missing and what you would ask to clarify it.

MOTIVATIONS are the underlying reasons WHY the user wants to train — e.g. "I want to feel more confident", 
"I want to keep up with my kids", "I want to reduce stress". A goal is NOT a motivation.
Motivations need to be emotionally meaningful enough that they can be referenced later to keep the user engaged.
Store these in the motivations field. If a motivation is too vague to be useful, note it in followUp.

IMPORTANT RULE: Both goals and motivations must be non-empty. If either is missing after extraction, set followUp
to ask for what's missing. If both are missing, combine the questions into one.

This phase is ONLY responsible for the motivations and goals fields.
Do NOT flag other fields (e.g. trainingBackground, performanceMetrics, injuries) as missing — those belong to a later phase and will be collected separately.
Set followUp to null if both motivations and goals are present.

If the user explicitly says they have no injuries, do not leave injuries empty. Store it as ["none reported"].
If the user explicitly asks a question, add it to pendingQsAndComments with a note that it is a user question. Rephrase it so that it is correct and complete in its form.
NEVER add internal observations, missing-field notes, or follow-up reminders to pendingQsAndComments — use the followUp field for those. pendingQsAndComments is ONLY for questions the user themselves asked.
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

export const MOTIVATIONS_AND_GOALS_GREETING = `
The user just finished the phase where they share their name and basic info,they
 probably provided it, check the user profile to be sure. They may
  have also shared something about their motivations and goals. We could acknowedge
  the information they provided to bridge the conversation, look at your personality if this is
  something that seems natural to comment on.
We want to find out about the users motivations and goals so we can make a good training plan. 
Now you the agent, is in the second phase of the onboarding process. 
 The question should be open ended and aproportatly for the user profile. Adapt to their 
 age and sport they selected, but also remomber to use your personality, but don't introduce yourself —
  introduction is already done. Keep the question short and open ended.`;
  

export const MOTIVATIONS_AND_GOALS_PROMPTS = {
  followUp: [
    `The user just replied to our first question about motivations and goals. And the asessor has
    found out what we need to follow up on. Look at the followUp field in the user profile — it contains exactly what we still need to ask about.
Ask ONLY about what is described in followUp. Do not ask about training background, injuries, experience, or any other topic — those belong to a later phase.
Keep it conversational and in character.`,

    `The user has replied once to our followup question about motivations and goals. We sent the answer to an asessor agent
    which updated the user profile and followup field. `,
    `Look again at the followUp field in the user profile. .This and only this field says what we need to follow up on.
    If there are still missing pieces about motivations and goals, ask about those with your personality `,
    
    `Look at userprofile.followup.We really wanna get to the bottom of whats driving them, and thats why we ask one last time about what it says in the followup field is missing.`
	],
	done: `With your personality, tell the user that we can revisit this later if they want,
  but for now we have what we need to move on to the next question.`,
} as const;
