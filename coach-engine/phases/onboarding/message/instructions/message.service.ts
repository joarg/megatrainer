import type { User } from '../../../../types/user.type.js';
import type { ONBOARDING_PHASES } from '../../../../types/types.js';

type OnboardingPhase = keyof typeof ONBOARDING_PHASES;

function appendUnique(existing: string[], assessed: string[]): string[] {
    const merged = [...existing];
    const seen = new Set(existing.map((item) => item.trim().toLowerCase()));

    for (const item of assessed) {
        const trimmed = item.trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !seen.has(key)) {
            seen.add(key);
            merged.push(trimmed);
        }
    }

    return merged;
}

export function mergeProfiles(
    assessmentProfile: User,
    currentUserProfile: User,
    phase: OnboardingPhase,
): User {
    const merged: User = {
        ...currentUserProfile,
        pendingQsAndComments: appendUnique(
            currentUserProfile.pendingQsAndComments,
            assessmentProfile.pendingQsAndComments,
        ),
        unclassifiedNotes: appendUnique(
            currentUserProfile.unclassifiedNotes,
            assessmentProfile.unclassifiedNotes,
        ),
        followUp: assessmentProfile.followUp,
    };

    switch (phase) {
        case 'basicInfo':
            return {
                ...merged,
                name: assessmentProfile.name ?? currentUserProfile.name,
                age: assessmentProfile.age ?? currentUserProfile.age,
                gender: assessmentProfile.gender ?? currentUserProfile.gender,
                genderNotes: assessmentProfile.genderNotes ?? currentUserProfile.genderNotes,
                location: assessmentProfile.location ?? currentUserProfile.location,
                country: assessmentProfile.country ?? currentUserProfile.country,
            };
        case 'motivationsAndGoals':
            return {
                ...merged,
                motivations: appendUnique(currentUserProfile.motivations, assessmentProfile.motivations),
                goals: appendUnique(currentUserProfile.goals, assessmentProfile.goals),
            };
        case 'backgroundAndMetrics':
            return {
                ...merged,
                trainingBackground: appendUnique(
                    currentUserProfile.trainingBackground,
                    assessmentProfile.trainingBackground,
                ),
                performanceMetrics: appendUnique(
                    currentUserProfile.performanceMetrics,
                    assessmentProfile.performanceMetrics,
                ),
                injuries: appendUnique(currentUserProfile.injuries, assessmentProfile.injuries),
            };
        case 'toolsAndTime':
            return {
                ...merged,
                equipmentAndSchedule: appendUnique(
                    currentUserProfile.equipmentAndSchedule,
                    assessmentProfile.equipmentAndSchedule,
                ),
            };
    }
}
