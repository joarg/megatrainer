import { availablePersonalities, MODEL, PHASE_MISSIONS, SELECTED_SPORT, SYSTEM_INSTRUCTION } from "./modelDefinitions";
import { callOllamaPhase } from "./ollama.service";

type QuestionCategory = "privacy" | "programme" | "other";
type QuestionHandler = (questionToAssess: string, category: QuestionCategory) => Promise<string>;

const routeTable: Record<QuestionCategory, QuestionHandler> = {
    privacy: handlePrivacyQuestion,
    programme: handleProgrammeQuestion,
    other: handleOtherQuestion,
};

export async function handleQsAndComments(questionToAssess: string) {
    const classification = await classifyQuestionOrComment(questionToAssess);
    const handler = routeTable[classification] ?? routeTable.other;
    const response = await handler(questionToAssess, classification);

    return {
        classification,
        response,
    };
}

function normalizeCategory(rawCategory: string): QuestionCategory {
    const normalized = rawCategory.trim().toLowerCase().replace(/[^a-z]/g, "");

    if (normalized === "privacy") {
        return "privacy";
    }

    if (normalized === "programme" || normalized === "program") {
        return "programme";
    }

    return "other";
}

async function answerQuestionWithPlaceholderAgent(questionToAssess: string, category: QuestionCategory) {
    const response = await callOllamaPhase({
        model: MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
        personality: availablePersonalities.assessor,
        phasemission: `${PHASE_MISSIONS.QandCommentsAnswerAgent_allSubjects}\nclassifiedCategory: ${category}\nrouteHint: Use the ${category} support policy and tone.`,
        selectedSport: SELECTED_SPORT,
        userMessage: questionToAssess,
    });

    return response.content;
}

async function handlePrivacyQuestion(questionToAssess: string, category: QuestionCategory) {
    return answerQuestionWithPlaceholderAgent(questionToAssess, category);
}

async function handleProgrammeQuestion(questionToAssess: string, category: QuestionCategory) {
    return answerQuestionWithPlaceholderAgent(questionToAssess, category);
}

async function handleOtherQuestion(questionToAssess: string, category: QuestionCategory) {
    return answerQuestionWithPlaceholderAgent(questionToAssess, category);
}

export async function classifyQuestionOrComment(questionToAssess: string): Promise<QuestionCategory> {
    const response = await callOllamaPhase({
        model: MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
        personality: availablePersonalities.assessor,
        phasemission: PHASE_MISSIONS.QandCommentClassifier,
        selectedSport: SELECTED_SPORT,
        userMessage: questionToAssess,
    });

    return normalizeCategory(response.content);
}