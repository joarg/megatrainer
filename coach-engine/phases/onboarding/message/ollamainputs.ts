import type { OllamaInput, TurnInput } from '../../../types/types.js'
import type { User } from '../../../types/user.type.js'



export function getAssessmentInput(currentAssessmentPrompt: string, input: TurnInput): OllamaInput {
    return {
        personality: 'neutral and concise,output is JSON only, the notes in the followup fields are  meant for other agents to formulate good questions with their own personality ',
        // The assessment agent never speaks to the user, but the language still matters:
        // it has to read (and store) answers written in the trainer's language.
        language: input.language,
        selectedSport: input.selectedSport,
        prompt: currentAssessmentPrompt,
        userMessage: input.userMessage,
        lastAssistantMessage: input.lastAssistantMessage,
        currentUserProfile: input.currentUserProfile,
    }
}



export function getResponseInput(currentPrompt: string, assessment: User, input: TurnInput): OllamaInput {
    return {
        personality: input.personality,
        language: input.language,
        selectedSport: input.selectedSport,
        currentUserProfile: assessment,
        prompt: currentPrompt,
        userMessage: input.userMessage,
        lastAssistantMessage: input.lastAssistantMessage,
    }
}