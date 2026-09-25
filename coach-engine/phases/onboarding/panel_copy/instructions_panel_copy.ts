// The profile panel shown next to the chat is built from a fixed set of phases and
// fields. Only the *wording* is generated per trainer — the keys, the order and which
// fields belong to which phase are structural and never come from the model.
//
// Two very different jobs are being done here, and keeping them apart is the whole
// point of this prompt:
//
//   - phase `label`/`blurb` are chrome. They carry the trainer's voice, so a drill
//     sergeant and a yoga teacher should sound nothing alike.
//   - field `label`s are the answer key. They tell the user what to actually type,
//     and the UI highlights them while that question is being asked. They must be
//     translated (so a Norwegian trainer's panel isn't half English) but never
//     reinterpreted — "Age" may become "Alder", never "Years in service".
export const PANEL_COPY_PROMPT = `You are writing the labels for a small progress panel that sits next to an onboarding chat. The user reads it to see what they have been asked for and what they have already answered.

You will be given the exact structure as JSON. Return the SAME structure with the same keys, filling in the wording.

There are two kinds of text, and they follow OPPOSITE rules.

1) PHASE "label" and "blurb" — these carry your personality.
- Rewrite them in your own voice, the way YOU would title that part of the conversation.
- "label" is a short heading: maximum 24 characters, no punctuation at the end.
- "blurb" is one short line explaining what the section covers: maximum 60 characters.
- Keep the meaning of the original, but the tone is entirely yours.

2) FIELD "label" — these are NOT creative. They are a form's answer key.
- Give the plainest, most ordinary everyday word for the thing being asked.
- Translate it into the target language. If the target language is English, keep the original word exactly as given.
- NEVER use metaphor, theme, slang, jargon or personality here. Do not stylise them to match your character.
- A different trainer speaking the same language must produce the SAME field labels as you.
- One or two words. No punctuation, no parentheses, no explanations.
- Example of what is CORRECT for Norwegian: "Age" becomes "Alder", "Name" becomes "Navn", "Location" becomes "Sted".
- Example of what is WRONG in any language: "Age" becoming "Years in service", "Trips around the sun", "Seasons survived". Never do this.

GENERAL RULES:
- Every "key" in the structure is an identifier. Copy each one EXACTLY as given, in English. Never translate, rename or reorder a key.
- Do not add or remove any phase or field.
- Return ONLY the JSON object, no commentary.`;
