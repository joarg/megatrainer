import { promptsForPhases } from './instructions/promptObject.js'
import { callOllama } from '../../../services/ollama.service.js';
import { getAssessmentInput, getResponseInput } from './ollamainputs.js';
import { parseJsonFromModelContent } from '../../../services/ollama.service.js';
import type { TurnInput, ProcessMessageResult, OllamaInput } from '../../../types/types.js';
import type { User } from '../../../types/user.type.js';
import { mergeProfiles } from './instructions/message.service.js';

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

    const mergedProfile = mergeProfiles(assessmentProfile, input.currentUserProfile!);
    console.log('Merging currentprofile with assessement profile and got :', mergedProfile);

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

    // Nothing is missing from the user profile in our phase after the assessment. Before asking
    // the next phase's intro question, do ONE silent check of whether the next phase is ALSO
    // already satisfied by data the user already volunteered earlier (e.g. equipment/time
    // mentioned in an early info-dump message) — if so, skip straight past it instead of
    // re-asking for info we already have. Deliberately bounded to a single lookahead hop (not a
    // full chain through every remaining phase): each blind lookahead call (no fresh user message
    // to react to) is both an extra ~10-30s LLM round trip and a bit less reliable at catching
    // genuine gaps than a real turn, so chaining through several in one request was both far too
    // slow in practice and let real gaps slip through. Any phases beyond the immediate next one
    // will still resolve quickly over the following turn(s).
    if (assessmentProfile.followUp === null) {
        const nextPhase = promptsForPhases[input.phase].nextPhase;
        console.log(`No follow up needed in ${input.phase} phase, checking next phase;`, nextPhase);
        if (!nextPhase) {
            // nextPhase is null here on purpose — input.phase was the last configured phase
            // (toolsAndTime), and it has nothing left in its followUp, so onboarding is complete.
            const responseObjectToReturn = {
                response: 'onboarding complete',
                updatedUserProfile: mergedProfile,
                nextPhase: null,
            };
            console.log('Returning from processMessage with onboarding complete :', responseObjectToReturn);
            console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
            return responseObjectToReturn;
        }

        // Silent lookahead: ask nextPhase's own assessment to judge the profile we already have,
        // with no new user message — this tells us whether nextPhase's own criteria are already
        // met purely from data collected so far.
        const lookaheadInput: OllamaInput = {
            personality: 'neutral and concise,output is JSON only, the notes in the followup fields are  meant for other agents to formulate good questions with their own personality ',
            selectedSport: input.selectedSport,
            prompt: promptsForPhases[nextPhase].assessmentPrompt,
            userMessage: '',
            currentUserProfile: mergedProfile,
        };
        const lookaheadProfile = await runAssessment(lookaheadInput, `${nextPhase} lookahead`);
        const introPrompt = promptsForPhases[nextPhase].introductionPrompt || 'empty prompt';

        // profileForIntro/introTargetPhase default to introducing nextPhase normally — used as-is
        // if the lookahead failed, or if nextPhase genuinely still needs something.
        let profileForIntro = mergedProfile;
        let introTargetPhase = nextPhase;

        if (lookaheadProfile) {
            const chainedProfile = mergeProfiles(lookaheadProfile, mergedProfile);
            if (!chainedProfile.followUp) {
                // nextPhase is ALSO already fully satisfied — skip past it in this same turn and
                // introduce whatever comes after it instead (or complete onboarding outright).
                console.log(`Lookahead found ${nextPhase} already satisfied, skipping ahead without asking.`);
                const afterNextPhase = promptsForPhases[nextPhase].nextPhase;
                if (!afterNextPhase) {
                    const responseObjectToReturn = {
                        response: 'onboarding complete',
                        updatedUserProfile: chainedProfile,
                        nextPhase: null,
                    };
                    console.log('Returning from processMessage with onboarding complete :', responseObjectToReturn);
                    console.log(`processMessage took ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
                    return responseObjectToReturn;
                }
                profileForIntro = chainedProfile;
                introTargetPhase = afterNextPhase;
            } else {
                console.log(`Lookahead found ${nextPhase} still needs data, introducing it.`, chainedProfile.followUp);
                profileForIntro = chainedProfile;
            }
        } else {
            console.log(`Lookahead assessment for ${nextPhase} failed, introducing it normally.`);
        }

        const finalIntroPrompt = introTargetPhase === nextPhase ? introPrompt : (promptsForPhases[introTargetPhase].introductionPrompt || 'empty prompt');
        console.log('Calling next phase response agent for next phase with :', finalIntroPrompt, profileForIntro);
        const responseInput = getResponseInput(finalIntroPrompt, profileForIntro, input);
        const response = await callOllama(responseInput);
        console.log('Response from next phase response agent :', response);
        const responseObjectToReturn = {
            response: response.content,
            updatedUserProfile: profileForIntro,
            nextPhase: introTargetPhase,
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
