export interface AttemptResponseScore {
    isCorrect: boolean;
}

export interface AttemptScore {
    scorePercentage: number;
    passed: boolean;
}

// Unanswered questions never produce a response row (see
// test_attempt_responses' idempotent-upsert design), so they simply don't
// contribute to `correct` here — the standard "unanswered counts as
// incorrect" default the spec asks for.
export function scoreAttempt(totalQuestions: number, responses: AttemptResponseScore[], passMark: number): AttemptScore {
    const correct = responses.filter((r) => r.isCorrect).length;
    const scorePercentage = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 10000) / 100 : 0;
    return { scorePercentage, passed: scorePercentage >= passMark };
}
