
export const INTRODUCTION_PROMPT = `
The user just finished the last phase, which was where we asked for their motivations and goals. That phase is now completed (we dont know if it was successful or not, check the userprofile to see. 
Lets tell the user that we are now going to ask them about their background and experience with the training. Make it encouraging and motivating, and let them know that there are no right or wrong answers, we just wanna understand them better to be able to help them.`


export const PROMPTS =
  [
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
  ]

export const ASSESSMENT_PROMPT = `You receive:
1) the latest user message
2) the accumulated user profile JSON

Your task: extract any relevant information from the user message and merge it into the profile.

Never discard information. Keep all existing profile values unless the user explicitly corrects them.

CRITICAL: Even if trainingBackground, performanceMetrics, or injuries already contain values from an earlier phase, you MUST still read the user's latest message and add any new, more detailed information it contains. An existing non-empty array does NOT mean the topic is fully covered — a prior phase may have only stored a placeholder (e.g. just a sport name). Always append genuinely new details from the current message on top of what's already there.

This phase is ONLY responsible for the trainingBackground, performanceMetrics, and injuries fields.

TRAINING BACKGROUND is the user's history and experience with the sport — e.g. "running for 3 years", "started training in 2022", "recently reduced training volume". Store these in trainingBackground.

PERFORMANCE METRICS are concrete, measurable numbers about their current ability — e.g. pace ("5:30/km"), distance ("10km per week"), times, PRs, or other quantifiable stats. Store these in performanceMetrics, not trainingBackground. If the user gives a number, distance, time, or pace, it belongs here.

For the followUp field: base "missing" on whether the user's messages so far actually cover trainingBackground, performanceMetrics, and injuries with real substance — not merely on whether the array happens to be non-empty. Return either null or a comma-separated list of missing field keys from [trainingBackground, performanceMetrics, injuries].
Use exact field keys only, no extra prose. Example: "trainingBackground,injuries".
If no fields are missing, set followUp to null.
"No" or "nothing" are valid answers to injuries, but ONLY if the user's own latest message actually says so — in that case store a single item meaning "none reported" (written in the same language as the rest of the profile) and do NOT include injuries in followUp. Never assume "no injuries" when the user hasn't actually said anything about injuries.

OUT-OF-SCOPE INFO: If the user's message contains other genuinely new information that belongs to a different phase (e.g. equipment/facilities they have access to, or training time/days per week) — do NOT guess which specific field it belongs to, and do NOT write it into trainingBackground or equipmentAndSchedule yourself. Instead, copy the user's exact relevant wording (one topic per entry) as a new item into unclassifiedNotes. A dedicated later step will route each note to the correct field. Configuration such as selectedSport is context, not a statement from the user, and must never be copied into the profile or unclassifiedNotes.

IMPORTANT: The previous message shown to you (role "assistant") is YOUR OWN prior question to the user, not something the user asked. Never copy or paraphrase it into pendingQsAndComments. Only add to pendingQsAndComments if the user's own latest message itself contains a genuine question or comment directed at you.
If the user has any questions then add it to pendingQsAndComments with a note that it is a user question. Rephrase it so that its correct and complete in its form.
Return the FULL profile JSON with these exact keys:
The JSON keys below, and the field keys used in followUp, are identifiers — always write them exactly as shown here, in English, even when the conversation is in another language. Only the VALUES are written in the user's language.
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
