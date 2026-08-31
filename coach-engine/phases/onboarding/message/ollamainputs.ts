import type { OllamaInput, TurnInput } from '../../../types/types.js'
import type { User } from '../../../types/user.type.js'



export function getAssessmentInput(currentAssessmentPrompt: string, input: TurnInput): OllamaInput {
    return {
        personality: 'neutral and concise,output is JSON only, the notes in the followup fields are  meant for other agents to formulate good questions with their own personality ',
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
        selectedSport: input.selectedSport,
        currentUserProfile: assessment,
        prompt: currentPrompt,
        userMessage: input.userMessage,
        lastAssistantMessage: input.lastAssistantMessage,
    }
}