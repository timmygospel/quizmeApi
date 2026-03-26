import { prisma } from "../../../../shared/infra/prisma/prismaClient";
import { ScoringService, AnswerInput } from "./ScoringService";
import { AttemptStatus } from "../../../../generated/prisma/client";

interface FinaliseAttemptRequest {
    attemptId: string;
    /** Pass explicitly to avoid a second DB round-trip if already known */
    passingScore?: number;
}

export interface FeedbackPayload {
    passed?: boolean;          // present when feedbackShowPassFail || passRateEnabled
    totalScore?: number;       // present when feedbackShowScore
    correctAnswers?: number;   // present when feedbackShowScore
    totalQuestions?: number;   // always present
}

export interface FinaliseAttemptResponse {
    attemptId: string;
    totalScore: number;
    passed: boolean | null;    // null when passRateEnabled = false
    correctAnswers: number;
    totalQuestions: number;
    unansweredQuestions: number;
    feedback: FeedbackPayload; // what is shown to the participant
}

/**
 * Reads all AttemptAnswers for the given attempt, runs ScoringService,
 * and persists totalScore / passed / status / completedAt back to the Attempt row.
 *
 * Sprint 6 additions:
 * - Respects quiz.passRateEnabled — only sets passed when enabled
 * - Returns a feedback payload shaped by quiz.feedbackEnabled / feedbackShowScore /
 *   feedbackShowPassFail
 */
export class FinaliseAttemptUseCase {
    async execute(
        req: FinaliseAttemptRequest,
    ): Promise<FinaliseAttemptResponse> {
        const attempt = await prisma.attempt.findUniqueOrThrow({
            where: { id: req.attemptId },
            include: {
                answers: {
                    include: {
                        question: { select: { topicTag: true } },
                    },
                },
                session: {
                    include: {
                        quiz: {
                            select: {
                                passingScore: true,
                                totalQuestions: true,
                                passRateEnabled: true,
                                feedbackEnabled: true,
                                feedbackShowScore: true,
                                feedbackShowPassFail: true,
                            },
                        },
                    },
                },
            },
        });

        const quiz = attempt.session.quiz;
        const totalQuestions = quiz?.totalQuestions ?? attempt.answers.length;
        const passingScore = req.passingScore ?? quiz?.passingScore ?? 70;
        const passRateEnabled = quiz?.passRateEnabled ?? false;

        const answerInputs: AnswerInput[] = attempt.answers.map((a) => ({
            questionId: a.questionId,
            topicTag: a.question.topicTag,
            isCorrect: a.isCorrect,
            answered: a.selectedOptionId !== null,
        }));

        // Pad with implicit unanswered entries
        const answeredIds = new Set(answerInputs.map((a) => a.questionId));
        const unansweredCount = totalQuestions - answeredIds.size;
        for (let i = 0; i < unansweredCount; i++) {
            answerInputs.push({
                questionId: `__unanswered_${i}`,
                topicTag: null,
                isCorrect: false,
                answered: false,
            });
        }

        const result = ScoringService.score(answerInputs, totalQuestions, passingScore);

        // Only apply pass/fail when pass rate is enabled for this quiz
        const passed: boolean | null = passRateEnabled ? result.passed : null;

        await prisma.attempt.update({
            where: { id: req.attemptId },
            data: {
                totalScore: result.totalScore,
                passed,
                status: AttemptStatus.COMPLETED,
                completedAt: new Date(),
            },
        });

        // Build feedback payload according to quiz feedback settings
        const feedback: FeedbackPayload = { totalQuestions };

        if (quiz?.feedbackEnabled) {
            if (quiz.feedbackShowScore) {
                feedback.totalScore = result.totalScore;
                feedback.correctAnswers = result.correctAnswers;
            }
            if (quiz.feedbackShowPassFail && passRateEnabled) {
                feedback.passed = result.passed;
            }
        } else if (passRateEnabled) {
            // Even without feedback, always expose pass/fail when pass rate is on
            feedback.passed = result.passed;
        }

        return {
            attemptId: req.attemptId,
            totalScore: result.totalScore,
            passed,
            correctAnswers: result.correctAnswers,
            totalQuestions: result.totalQuestions,
            unansweredQuestions: result.unansweredQuestions,
            feedback,
        };
    }
}
