/**
 * ScoringService
 *
 * Encapsulates all quiz scoring logic for the dashboard analytics module.
 * Scoring rules:
 *  - Total score = (correct answers / total questions) * 100, rounded to 2dp
 *  - Unanswered questions count as incorrect
 *  - Pass/fail is determined by comparing totalScore against the quiz passingScore threshold
 *  - Topic-level scores aggregate answers by question.topicTag
 *  - For multiple attempts by the same participant, the caller decides which attempt
 *    to evaluate (latest / best) — this service scores a single attempt in isolation
 */

export interface AnswerInput {
    questionId: string;
    topicTag: string | null;
    isCorrect: boolean;
    answered: boolean; // false = question was skipped / unanswered
}

export interface TopicScore {
    topicTag: string;
    correct: number;
    total: number;
    score: number; // percentage 0–100
}

export interface ScoreResult {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
    unansweredQuestions: number;
    totalScore: number;   // percentage 0–100, rounded to 2dp
    passed: boolean;
    topicScores: TopicScore[];
}

export class ScoringService {
    /**
     * Score a single attempt given its answers and the quiz passing threshold.
     *
     * @param answers      - Array of answer inputs (one per question in the quiz)
     * @param totalQuestions - Total number of questions in the quiz (used as denominator
     *                         even when some questions have no answer row)
     * @param passingScore  - Minimum percentage required to pass (0–100, default 70)
     */
    static score(
        answers: AnswerInput[],
        totalQuestions: number,
        passingScore: number = 70,
    ): ScoreResult {
        if (totalQuestions <= 0) {
            throw new Error("totalQuestions must be greater than 0");
        }
        if (passingScore < 0 || passingScore > 100) {
            throw new Error("passingScore must be between 0 and 100");
        }

        // Unanswered questions not present in the answers array
        const answeredCount = answers.filter((a) => a.answered).length;
        const unansweredCount = totalQuestions - answeredCount;

        // Only answered-and-correct count toward the score
        const correctCount = answers.filter(
            (a) => a.answered && a.isCorrect,
        ).length;

        const totalScore = ScoringService.roundTwoDecimals(
            (correctCount / totalQuestions) * 100,
        );

        const passed = totalScore >= passingScore;

        const topicScores = ScoringService.computeTopicScores(
            answers,
            totalQuestions,
        );

        return {
            totalQuestions,
            answeredQuestions: answeredCount,
            correctAnswers: correctCount,
            unansweredQuestions: unansweredCount,
            totalScore,
            passed,
            topicScores,
        };
    }

    /**
     * Determine which attempt to surface for a participant with multiple attempts.
     * Strategy options: "latest" (default) or "best".
     */
    static selectAttempt<T extends { totalScore: number | null; completedAt: Date | null }>(
        attempts: T[],
        strategy: "latest" | "best" = "latest",
    ): T | null {
        const completed = attempts.filter((a) => a.completedAt !== null);
        if (completed.length === 0) return null;

        if (strategy === "best") {
            return completed.reduce((best, current) =>
                (current.totalScore ?? 0) > (best.totalScore ?? 0) ? current : best,
            );
        }

        // "latest" — most recently completed
        return completed.reduce((latest, current) =>
            current.completedAt! > latest.completedAt! ? current : latest,
        );
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private static computeTopicScores(
        answers: AnswerInput[],
        totalQuestions: number,
    ): TopicScore[] {
        // Group questions by topic. Unanswered questions (not in answers array)
        // contribute to the denominator of their topic if a topicTag is known;
        // since we only have answers here, they are implicitly counted as incorrect
        // via the overall score but cannot be attributed to a topic without that info.
        // Callers should include an AnswerInput with answered=false for every question.

        const topicMap = new Map<
            string,
            { correct: number; total: number }
        >();

        const untaggedKey = "Untagged";

        for (const answer of answers) {
            const tag = answer.topicTag ?? untaggedKey;
            if (!topicMap.has(tag)) {
                topicMap.set(tag, { correct: 0, total: 0 });
            }
            const bucket = topicMap.get(tag)!;
            bucket.total += 1;
            if (answer.answered && answer.isCorrect) {
                bucket.correct += 1;
            }
        }

        return Array.from(topicMap.entries()).map(([topicTag, { correct, total }]) => ({
            topicTag,
            correct,
            total,
            score: ScoringService.roundTwoDecimals((correct / total) * 100),
        }));
    }

    private static roundTwoDecimals(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
