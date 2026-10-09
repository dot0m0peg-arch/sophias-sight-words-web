export const TRAIN_GOAL = 5;

export function advanceTrain(words, word, correct) {
    if (!correct) return [];
    if (words.length >= TRAIN_GOAL) return words.slice(0, TRAIN_GOAL);
    return [...words, word];
}

export function advanceShoeLacing(stage, successfulPair) {
    if (!successfulPair || stage === 7) return stage;
    return Math.min(stage + 1, 7);
}

export function resetShoeAfterCelebration(stage) {
    return stage === 7 ? 0 : stage;
}

export const wordPopBurstDurationSeconds = 0.36;

export function shouldStartWordPopBurst(game, word, target, locked) {
    return game === "pop" && word === target && !locked;
}

export function wordPopBurstPresentation(progress) {
    let p = Math.max(0, Math.min(1, progress));
    return {
        shellScale: 1 + 0.22 * p,
        shellAlpha: 1 - p,
        wordScale: 1,
        wordAlpha: 1
    };
}

