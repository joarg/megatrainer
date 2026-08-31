import type { User } from '../../../../types/user.type.js';

export function mergeProfiles(assessmentProfile: User, currentUserProfile: User): User {
    return Object.fromEntries(
        Object.keys({ ...assessmentProfile, ...currentUserProfile }).map(key => {
            const currentVal = (currentUserProfile as any)[key];
            const assessedVal = (assessmentProfile as any)[key];

            if (key === 'followUp') {
                return [key, assessedVal !== undefined ? assessedVal : currentVal];
            }
            if (Array.isArray(currentVal)) {
                // Combine both lists instead of dropping new items once the field is non-empty,
                // so data captured in later phases (e.g. tools/time) isn't lost.
                if (Array.isArray(assessedVal)) {
                    const merged = [...currentVal];
                    for (const item of assessedVal) {
                        if (!merged.includes(item)) merged.push(item);
                    }
                    return [key, merged];
                }
                return [key, currentVal.length > 0 ? currentVal : assessedVal];
            }
            // Prefer the freshly assessed value for scalar fields so explicit corrections
            // (e.g. "actually I'm 35, not 44") actually take effect. The assessment prompts
            // already instruct the model to echo forward unchanged fields, so assessedVal is
            // expected to equal currentVal on turns with no correction — only fall back to
            // currentVal when the assessment genuinely didn't provide a value.
            return [key, assessedVal !== null && assessedVal !== undefined ? assessedVal : currentVal];
        })
    ) as User;
}
