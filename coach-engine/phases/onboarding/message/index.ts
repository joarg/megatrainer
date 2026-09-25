import { promptsForPhases, ownedFieldsForPhase } from './instructions/promptObject.js'
import { callOllama } from '../../../services/ollama.service.js';
import { getAssessmentInput, getResponseInput } from './ollamainputs.js';
import { parseJsonFromModelContent } from '../../../services/ollama.service.js';
import type { TurnInput, ProcessMessageResult, OllamaInput } from '../../../types/types.js';
import type { User } from '../../../types/user.type.js';
import { mergeProfiles } from './instructions/message.service.js';
import { classifyUnclassifiedNotes, applyClassifierUpdate } from './instructions/classifier.js';


const MAX_ASSESSMENT_ATTEMPTS = 3;

// The final in-character sign-off, asked for once the phase chain is exhausted. Kept
// deliberately brief: this is a closing beat, not a chance to re-litigate goals.
const CLOSING_PROMPT = `Every phase of the onboarding is now complete — the profile in currentUserProfile holds everything we are going to get from this conversation.

Write a short closing message to the user, in your own voice and personality:
- Wrap up warmly and decisively, like a coach signing off after a first session.
- Refer naturally to one or two specific things they told you (from the profile), so it reads personal rather than generic.
- Tell them what happens next and what you now have to work with.
- Do NOT ask any further questions, and do NOT invent new data.
- Keep it to a few sentences.`;

// Used only if the closing agent call itself fails. Still in-character copy rather
// than a sentinel, because whatever we return is shown to the user verbatim.
const FALLBACK_CLOSING =
    "That's everything I need. I've got your details logged, and the next step is turning this into a plan you can actually follow. We'll go from here.";

// Keys the assessment agents are contractually required to return. Used only as a
// sanity check: a model answering in another language sometimes translates the JSON
// keys themselves ("navn" instead of "name"). That still parses as valid JSON, so
// without this check it would sail past the retry loop and then silently merge into
// nothing — every `assessmentProfile.name ?? current.name` falls back and the turn
// captures zero information, with no error logged anywhere. Checking for *some*
// overlap (rather than an exact match) keeps this tolerant of models that omit keys
// they have nothing to say about, while still catching a wholesale key translation.
const EXPECTED_ASSESSMENT_KEYS = [
    'name', 'age', 'gender', 'genderNotes', 'location', 'country',
    'trainingBackground', 'performanceMetrics', 'injuries',
    'motivations', 'goals', 'equipmentAndSchedule',
    'pendingQsAndComments', 'unclassifiedNotes', 'followUp',
];

function hasExpectedAssessmentKeys(parsed: unknown): boolean {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    const keys = Object.keys(parsed as Record<string, unknown>);
    return keys.some((key) => EXPECTED_ASSESSMENT_KEYS.includes(key));
}

// Runs a phase's assessment agent against the given OllamaInput, retrying a couple of times if
// the model returns non-JSON prose instead of the expected profile JSON. Returns undefined
// (instead of throwing) if every attempt fails, so callers can fall back gracefully.
async function runAssessment(assessmentInput: OllamaInput, logLabel: string): Promise<User | undefined> {
    for (let attempt = 1; attempt <= MAX_ASSESSMENT_ATTEMPTS; attempt++) {
        // Held outside the try so the catch can report what the model actually said.
        // parseJsonFromModelContent only puts the first 120 chars in its SyntaxError,
        // so without this a parse failure is undiagnosable from the logs — we know it
        // failed, but not whether the model refused, answered in prose, or emitted a
        // truncated object.
        let rawContent: string | undefined;
        try {
            const assessmentMessage = await callOllama(assessmentInput);
            rawContent = assessmentMessage.content;
            const parsed = parseJsonFromModelContent(assessmentMessage.content);
            if (!hasExpectedAssessmentKeys(parsed)) {
                throw new Error(
                    `Assessment JSON has none of the expected profile keys (got: ${Object.keys(parsed ?? {}).join(', ') || 'none'})`
                );
            }
            console.log(`Response from assessment agent (${logLabel}) :`, assessmentMessage);
            return parsed;
        } catch (err) {
            console.log(`Assessment agent (${logLabel}) attempt ${attempt}/${MAX_ASSESSMENT_ATTEMPTS} failed:`, err);
            if (rawContent !== undefined) {
                console.log(`  ↳ raw ${logLabel} response (attempt ${attempt}, ${rawContent.length} chars):`, rawContent);
            }
        }
    }
    return undefined;
}

// Plain structural check used to decide whether a later phase can be skipped without
// asking its own question: true only if every field that phase owns already holds real
// data. No LLM judgment involved, so there's nothing to hallucinate — those fields can
// only ever have been populated from actual user-provided text (see promptObject.ts's
// ownedFieldsForPhase for why this is safe to trust).
function isPhaseAlreadySatisfied(phase: keyof typeof promptsForPhases, profile: User): boolean {
    return missingOwnedFields(phase, profile).length === 0;
}

// Returns the owned fields for `phase` that are still empty in `profile`. This is the
// single source of truth for "is this phase done?" — we deliberately do NOT trust the
// assessment agent's own `followUp` value for that decision. Small models routinely
// return `followUp: null` while `age` is still null (the prompt nudges them towards
// null twice), which used to let the conversation sail straight into the next phase
// without ever re-asking. The model's followUp is now only a hint that gets overridden
// by this structural check.
function missingOwnedFields(phase: keyof typeof promptsForPhases, profile: User): (keyof User)[] {
    return ownedFieldsForPhase[phase].filter((field) => {
        const value = profile[field];
        if (Array.isArray(value)) return value.length === 0;
        if (typeof value === 'string') return value.trim() === '';
        return value == null;
    });
}

export async function processMessage(input: TurnInput): Promise<ProcessMessageResult> {
    // TIP: this is how to call and get the correct format with colors and all
    //bun index.ts | awk '{gsub(/\\n/,"\n")}1'

    const startTime = Date.now();
    const currentAssessmentPrompt = promptsForPhases[input.phase].assessmentPrompt;
    const phasePrompts = promptsForPhases[input.phase].prompts;
    // phaseAttempts is 0 on the first message assessed in this phase, so index directly
    // (not phaseAttempts - 1) to line up attempt 0 with the first scripted follow-up prompt.
    const maxAttempts = phasePrompts.length;
    let trainerPrompt = phasePrompts[input.phaseAttempts] ?? phasePrompts[maxAttempts - 1];

    //asessment agent — the model occasionally returns non-JSON prose instead of the expected
    // profile JSON; retry a couple of times before giving up gracefully instead of letting an
    // unhandled parse error crash the whole request.
    const assesmentInput = getAssessmentInput(currentAssessmentPrompt, input);
    console.log('Calling assesment agent with :', assesmentInput.userMessage);
    const assessmentProfile = await runAssessment(assesmentInput, input.phase);

    if (!assessmentProfile) {
        console.log(`Assessment agent failed after ${MAX_ASSESSMENT_ATTEMPTS} attempts, returning graceful fallback.`);
        console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        return {
            response: "Sorry, I had a little trouble processing that — could you try rephrasing your last message?",
            updatedUserProfile: input.currentUserProfile!,
            nextPhase: input.phase,
        };
    }

    let mergedProfile = mergeProfiles(assessmentProfile, input.currentUserProfile!, input.phase);
    console.log('Merging currentprofile with assessement profile and got :', mergedProfile);

    // If this phase's assessment noticed something outside its own scope, it will have
    // dropped a raw snippet into unclassifiedNotes instead of guessing a field. Route
    // those into their real fields now, using only the real text that was actually said
    // (as opposed to the old "silent lookahead", which asked an assessment prompt to
    // judge with no new evidence at all and could hallucinate placeholder answers).
    if (mergedProfile.unclassifiedNotes && mergedProfile.unclassifiedNotes.length > 0) {
        console.log(`Routing ${mergedProfile.unclassifiedNotes.length} unclassified note(s) captured during ${input.phase} phase.`);
        const classifierUpdate = await classifyUnclassifiedNotes(mergedProfile.unclassifiedNotes, mergedProfile, input.language);
        mergedProfile = applyClassifierUpdate(mergedProfile, classifierUpdate);
    }

    // Deterministically decide whether this phase is actually complete. The assessment
    // agent's own followUp is unreliable (it says null while fields are still empty, or
    // it hallucinates a value like age=30 from nothing), so recompute from the merged
    // profile and overwrite it. followUp is a comma-separated list of missing field keys,
    // matching the format the assessment prompt already asks the model to use.
    const stillMissing = missingOwnedFields(input.phase, mergedProfile);
    if (stillMissing.length > 0 && mergedProfile.followUp === null) {
        console.log(`Assessment agent said followUp=null but ${input.phase} still has empty fields: ${stillMissing.join(', ')} — overriding.`);
    }
    mergedProfile = {
        ...mergedProfile,
        followUp: stillMissing.length > 0 ? stillMissing.join(',') : null,
    };

    // We've already used every scripted follow-up prompt (including the "last attempt, move on" one)
    // and the profile is still incomplete. Stop asking and force the phase forward instead of
    // looping forever on out-of-bounds prompts.
    if (mergedProfile.followUp && input.phaseAttempts >= maxAttempts) {
        const nextPhase = promptsForPhases[input.phase].nextPhase;
        const giveUpPrompt = phasePrompts[maxAttempts - 1];
        console.log(`Exhausted all ${maxAttempts} attempts in ${input.phase} phase, forcing move to next phase;`, nextPhase);
        const responseInput = getResponseInput(giveUpPrompt, mergedProfile, input);
        const response = await callOllama(responseInput);
        console.log('Response from give-up agent :', response);
        console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        return {
            response: response.content,
            updatedUserProfile: mergedProfile,
            nextPhase,
        };
    }

    //The response agent will ask followup questions about stuff thats possibly  missing. 
    if (mergedProfile.followUp) {
        // Pass the *merged* profile (with the corrected followUp), not the raw assessment
        // output — otherwise the response agent sees the model's bogus followUp=null and
        // has nothing to ask about.
        const responseInput = getResponseInput(trainerPrompt, mergedProfile, input);
        console.log('Calling response follow up agent with :', responseInput.prompt, 'last message was :', input.lastAssistantMessage);
        const response = await callOllama(responseInput);
        console.log('Response from response follow up agent :', response);
        console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        return {
            response: response.content,
            updatedUserProfile: mergedProfile,
            nextPhase: input.phase,
        };
    }

    // Nothing is missing from the user profile in our phase after the assessment. Walk
    // forward through subsequent phases, skipping any whose own fields are already fully
    // populated — a plain structural check, no LLM call involved. This is safe (unlike the
    // old "silent lookahead", which asked an assessment prompt to judge with zero new
    // evidence and could hallucinate a false "satisfied" signal): a phase's owned fields
    // can only ever contain real data, either from that phase's own turn, or from the
    // unclassifiedNotes classifier routing something the user genuinely said earlier.
    // Since there's no LLM cost per hop, we can chain through every already-satisfied
    // phase in one turn instead of bounding it to a single lookahead hop.
    if (mergedProfile.followUp === null) {
        let candidatePhase = promptsForPhases[input.phase].nextPhase;
        console.log(`No follow up needed in ${input.phase} phase, checking next phase;`, candidatePhase);

        while (candidatePhase && isPhaseAlreadySatisfied(candidatePhase, mergedProfile)) {
            console.log(`${candidatePhase} fields are already populated from earlier in the conversation, skipping without asking.`);
            candidatePhase = promptsForPhases[candidatePhase].nextPhase;
        }

        if (!candidatePhase) {
            // We walked off the end of the phase chain with everything already satisfied.
            // `response` is rendered verbatim as the trainer's next chat bubble, so this
            // must be real in-character copy — it used to be the literal string
            // "onboarding complete", which reached the user as a debug sentinel. Ask the
            // response agent for a sign-off, with a neutral fallback if that call fails
            // so a finishing turn can never end up blank.
            let closingText: string;
            try {
                const closingInput = getResponseInput(CLOSING_PROMPT, mergedProfile, input);
                const closing = await callOllama(closingInput);
                console.log('Response from closing agent :', closing);
                closingText = closing.content?.trim() || FALLBACK_CLOSING;
            } catch (err) {
                console.error('Closing agent failed, using fallback copy:', err);
                closingText = FALLBACK_CLOSING;
            }

            const responseObjectToReturn = {
                response: closingText,
                updatedUserProfile: mergedProfile,
                nextPhase: null,
            };
            console.log('Returning from processMessage with onboarding complete :', responseObjectToReturn);
            console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
            return responseObjectToReturn;
        }

        const introPrompt = promptsForPhases[candidatePhase].introductionPrompt || 'empty prompt';
        console.log('Calling next phase response agent for next phase with :', introPrompt, mergedProfile);
        const responseInput = getResponseInput(introPrompt, mergedProfile, input);
        const response = await callOllama(responseInput);
        console.log('Response from next phase response agent :', response);
        const responseObjectToReturn = {
            response: response.content,
            updatedUserProfile: mergedProfile,
            nextPhase: candidatePhase,
        };
        console.log('Returning from processMessage with nextPhase :', responseObjectToReturn);
        console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
        return responseObjectToReturn;
    }
    // neither followup or not followup... probably an error or something we didnt account for, return something neutral
    const responseObjectToReturn = {
        response: 'invalid response, something went wrong with the assessment or response agent, check logs',
        updatedUserProfile: mergedProfile,
        nextPhase: input.phase,
    };
    console.log('Returning from processMessage with :', responseObjectToReturn);
    console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
    return responseObjectToReturn;
}
