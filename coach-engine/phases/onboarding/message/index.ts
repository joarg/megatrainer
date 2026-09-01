import { promptsForPhases, ownedFieldsForPhase } from './instructions/promptObject.js'
import { callOllama } from '../../../services/ollama.service.js';
import { getAssessmentInput, getResponseInput } from './ollamainputs.js';
import { parseJsonFromModelContent } from '../../../services/ollama.service.js';
import type { TurnInput, ProcessMessageResult, OllamaInput } from '../../../types/types.js';
import type { User } from '../../../types/user.type.js';
import { mergeProfiles } from './instructions/message.service.js';
import { classifyUnclassifiedNotes, applyClassifierUpdate } from './instructions/classifier.js';

const MAX_ASSESSMENT_ATTEMPTS = 3;

// Runs a phase's assessment agent against the given OllamaInput, retrying a couple of times if
// the model returns non-JSON prose instead of the expected profile JSON. Returns undefined
// (instead of throwing) if every attempt fails, so callers can fall back gracefully.
async function runAssessment(assessmentInput: OllamaInput, logLabel: string): Promise<User | undefined> {
    for (let attempt = 1; attempt <= MAX_ASSESSMENT_ATTEMPTS; attempt++) {
        try {
            const assessmentMessage = await callOllama(assessmentInput);
            const parsed = parseJsonFromModelContent(assessmentMessage.content);
            console.log(`Response from assessment agent (${logLabel}) :`, assessmentMessage);
            return parsed;
        } catch (err) {
            console.log(`Assessment agent (${logLabel}) attempt ${attempt}/${MAX_ASSESSMENT_ATTEMPTS} failed:`, err);
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
    return ownedFieldsForPhase[phase].every((field) => {
        const value = profile[field];
        return Array.isArray(value) ? value.length > 0 : value != null;
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

    let mergedProfile = mergeProfiles(assessmentProfile, input.currentUserProfile!);
    console.log('Merging currentprofile with assessement profile and got :', mergedProfile);

    // If this phase's assessment noticed something outside its own scope, it will have
    // dropped a raw snippet into unclassifiedNotes instead of guessing a field. Route
    // those into their real fields now, using only the real text that was actually said
    // (as opposed to the old "silent lookahead", which asked an assessment prompt to
    // judge with no new evidence at all and could hallucinate placeholder answers).
    if (mergedProfile.unclassifiedNotes && mergedProfile.unclassifiedNotes.length > 0) {
        console.log(`Routing ${mergedProfile.unclassifiedNotes.length} unclassified note(s) captured during ${input.phase} phase.`);
        const classifierUpdate = await classifyUnclassifiedNotes(mergedProfile.unclassifiedNotes, mergedProfile);
        mergedProfile = applyClassifierUpdate(mergedProfile, classifierUpdate);
    }

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
        const responseInput = getResponseInput(trainerPrompt, assessmentProfile, input);
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
    if (assessmentProfile.followUp === null) {
        let candidatePhase = promptsForPhases[input.phase].nextPhase;
        console.log(`No follow up needed in ${input.phase} phase, checking next phase;`, candidatePhase);

        while (candidatePhase && isPhaseAlreadySatisfied(candidatePhase, mergedProfile)) {
            console.log(`${candidatePhase} fields are already populated from earlier in the conversation, skipping without asking.`);
            candidatePhase = promptsForPhases[candidatePhase].nextPhase;
        }

        if (!candidatePhase) {
            // We walked off the end of the phase chain with everything already satisfied.
            const responseObjectToReturn = {
                response: 'onboarding complete',
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
