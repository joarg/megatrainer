import { callOllamaPhase } from "./services/ollama.service";
import { MODEL, SELECTED_SPORT, SYSTEM_INSTRUCTION, SELECTEDPERSONALITY, PHASE_MISSIONS, availablePersonalities} from './modelDefinitions';

// lets start by calling the callOllamaPhase with the intention of getting our first greeting for the user to reply to. 
export async function createInitialGreeting() {
    const response = await callOllamaPhase({
        model: MODEL,
        systemInstruction: SYSTEM_INSTRUCTION,
        personality: SELECTEDPERSONALITY,
        phasemission: PHASE_MISSIONS.greeting,
        selectedSport: SELECTED_SPORT,
        userMessage: "Hello",
    });
    return response;
}
