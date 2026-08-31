
export const INTRODUCTION_PROMPT = `
The user just finished the last phase, which was where we asked for their basic information. That phase is now completed (we dont know if it was successful or not, check the userprofile to see. 
Lets tell the user that we are now going to ask them about their motivations and
 goals for training.`


export const ASSESSMENT_PROMPT = `CRITICAL: Respond with ONLY the JSON object. No prose, no chat, no explanation — just the raw JSON.

You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Capture ANY relevant data the user mentions that you think fits into a field in the user data.
Never discard information. Keep all existing profile values unless the user explicitly corrects them.

In this turn we especially want to know about the users motivations and goals for training. These are two distinct concepts:

GOALS are concrete outcomes the user wants to achieve — e.g. "bench press my own bodyweight", "run a 5k", "lose 10kg". 
They should be specific and ideally measurable. Store these in the goals field.
Assess whether the goal can be tracked against performance metrics in the selected sport once those are provided.
If the goal is not measurable, note in followUp what is missing and what you would ask to clarify it.

MOTIVATIONS are the underlying reasons WHY the user wants to train — e.g. "I want to feel more confident", 
"I want to keep up with my kids", "I want to reduce stress". A goal is NOT a motivation.
Motivations need to be emotionally meaningful enough that they can be referenced later to keep the user engaged.
Store these in the motivations field. If a motivation is too vague to be useful, note it in followUp.

IMPORTANT RULE: Both goals and motivations must be non-empty. If either is missing after extraction, set followUp
to be a short sentence about about what is missing. The follow up field will not be read by the user, but other ai-agents that 
will make it into a question. If both are missing, say so in the followup.

This phase is ONLY responsible for the motivations and goals fields.
Do NOT flag other fields (e.g. trainingBackground, performanceMetrics, injuries) as missing — those belong to a later phase and will be collected separately.
Do NOT write vague or placeholder values into trainingBackground or performanceMetrics in this phase (e.g. just a bare sport name, or a passing mention of a skill) — leave those alone unless the user gives concrete, specific details; the phase that owns them will ask properly later.
EXCEPTION: if the user explicitly states what equipment/facilities they have access to, or how much time/how many days per week they can train, capture that concrete detail into trainingBackground right away (e.g. "home gym", "3 days per week") so it isn't lost, even though this phase doesn't normally own that field.
Set followUp to null if both motivations and goals are present.

If the user explicitly says they have no injuries, do not leave injuries empty. Store it as ["none reported"].
IMPORTANT: The previous message shown to you (role "assistant") is YOUR OWN prior question to the user, not something the user asked. Never copy or paraphrase it into pendingQsAndComments. Only add to pendingQsAndComments if the user's own latest message itself contains a genuine question or comment directed at you.
If the user explicitly asks a question, add it to pendingQsAndComments with a note that it is a user question. Rephrase it so that it is correct and complete in its form.
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
  "pendingQsAndComments": string[],
  "followUp": string|null
}`;

export const PROMPTS = 
 [
    `Dont make any comments on the users goals, lets just take it for what
     it is, a goal. We dont know if its good or bad or approporiate yet,
      we just know its a goal. Asssesment of the goal will come later, so for now 
      we just Look at the followUp field in the currentUser profile — it contains 
    exactly what we still need to ask about. Just use your personality to ask about whatever this is, and nothing else.
`,

    `Dont make any comments on the users goals, lets just take it for what
     it is, a goal. We dont know if its good or bad or approporiate yet,
      we just know its a goal. Asssesment of the goal will come later, so for now 
      we just Look at the followUp field in the currentUser profile — it contains 
    exactly what we still need to ask about. Just use your personality to ask about whatever this is, and nothing else. This is the second attempt to get the users motivations and goals, so maybe look at the last message and the usermessage and try to understand why the question remains unanswered.  `,
    
    `Dont make any comments on the users goals, lets just take it for what
     it is, a goal. We dont know if its good or bad or approporiate yet,
      we just know its a goal. Asssesment of the goal will come later, so for now 
      we do two things. Look at the followUp field in the currentUser profile — it contains 
    exactly what we still need to ask about. Just use your personality to ask about whatever
     this is, and nothing else. Second. This is the third and last attempt to get the users motivations and
      goals, so maybe look at the last message and the usermessage and try to
       understand why the question remains unanswered. Acknowledge that the user might not be ready to share this. `
	]
