import { handleQsAndComments } from './services/handleQsAndComments';
import { MODEL, SYSTEM_INSTRUCTION, SELECTEDPERSONALITY, PHASE_MISSIONS, SELECTED_SPORT, availablePersonalities, AGE_GENDER_LOCATION_RESPONSES } from './modelDefinitions';
import { callOllamaPhase, parseJsonFromModelContent } from './ollama.service';
import { createEmptyUser, mergeUser } from './user.service';
import { User, UserUpdate } from './types/user.type';



export async function assessGreetingResponse(attemptCounter: number, userInfoJson: object = {}) {
    const response = await callOllamaPhase({
        model: MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
        personality: availablePersonalities.assessor,
        phasemission: PHASE_MISSIONS.greetingAssesment,
        selectedSport: SELECTED_SPORT,
        userMessage: AGE_GENDER_LOCATION_RESPONSES[attemptCounter],
        currentUserInfo: JSON.stringify(userInfoJson),
    });
    return response;
}
export async function followUpBasicUserInfo(currentUserInfo: string, attemptCounter: number) {
    const response = await callOllamaPhase({
        model: MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
        personality: SELECTEDPERSONALITY,
        phasemission: PHASE_MISSIONS.followUpBasicUserInfo[attemptCounter],
        selectedSport: SELECTED_SPORT,
        userMessage: currentUserInfo,
    });
    return response;
}

async function processPendingQsAndComments(user: User) {
    while (user.pendingQsAndComments.length > 0) {
        const nextQuestionOrComment = user.pendingQsAndComments[0];

        try {
            const handled = await handleQsAndComments(nextQuestionOrComment);
            console.log(`Handled pending ${handled.classification} question/comment: ${nextQuestionOrComment}`);
            console.log(`Agent answer: ${handled.response}`);

            // Remove only after successful handling.
            user.pendingQsAndComments.shift();
        } catch (error) {
            console.log("Failed to handle pending question/comment. Keeping it in queue for retry.", error);
            break;
        }
    }
}

export async function attemptBasicUserInfo() {
    const maxFollowUps = PHASE_MISSIONS.followUpBasicUserInfo.length;

    async function tryBasicUserInfo(attemptCounter: number, accumulatedUserInfo: User): Promise<User> {

        console.log(`Attempt ${attemptCounter} to get basic user info...`);
        if (attemptCounter >= maxFollowUps) {
            console.log("Reached the end of available onboarding responses. Continuing with accumulated info.");
            return accumulatedUserInfo;
        }
        const greetingAssessment = await assessGreetingResponse(attemptCounter, accumulatedUserInfo);
        console.log(`USER SAYS: ${AGE_GENDER_LOCATION_RESPONSES[attemptCounter]}`);
        const parsedGreetingAssessment = parseJsonFromModelContent(greetingAssessment.content) as UserUpdate;
        const mergedUser = mergeUser(accumulatedUserInfo, parsedGreetingAssessment);

        if (mergedUser.pendingQsAndComments.length > 0) {
            await processPendingQsAndComments(mergedUser);
        }

        if (mergedUser.followUp === null) {
            console.log("no follow up needed, user provided all basic info, we can continue the interview with the updated user file");
            return mergedUser;
        }

        if (attemptCounter >= maxFollowUps) {
            console.log("user did not provide the information after multiple attempts, we should continue the interview and try to get this information later, but for now we will just continue with the information we have");
            return mergedUser;
        }
        const followUpResponse = await followUpBasicUserInfo(JSON.stringify(mergedUser), attemptCounter);
        console.log(`Follow-up response number ${attemptCounter}:`, followUpResponse.content);


        return tryBasicUserInfo(attemptCounter + 1, mergedUser);
    }

    return tryBasicUserInfo(0, createEmptyUser());
}