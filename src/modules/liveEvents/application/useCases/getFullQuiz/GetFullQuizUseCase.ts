/**
 * GetFullQuizUseCase
 *
 * Used in FULL quiz mode: returns the complete question set for a live event
 * so the participant can complete the quiz in one uninterrupted flow.
 *
 * Only allowed when the session's quiz has mode = FULL.
 * Returns questions WITHOUT revealing which option is correct.
 */

import { prisma } from "../../../../../shared/infra/prisma/prismaClient";

export interface FullQuizOptionDTO {
    index: number;
    text: string;
}

export interface FullQuizQuestionDTO {
    index: number;
    text: string;
    options: FullQuizOptionDTO[];
}

export interface FullQuizDTO {
    eventCode: string;
    quizTitle: string;
    timed: boolean;
    timeLimitSeconds: number | null;
    totalQuestions: number;
    questions: FullQuizQuestionDTO[];
}

export class GetFullQuizUseCase {
    async execute(eventCode: string): Promise<FullQuizDTO> {
        const session = await prisma.quizSession.findUnique({
            where: { eventCode },
            include: {
                quiz: {
                    include: {
                        questions: {
                            orderBy: { index: "asc" },
                            include: {
                                options: {
                                    orderBy: { index: "asc" },
                                    select: { index: true, text: true },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!session) {
            const err: any = new Error("Live event not found");
            err.code = "NOT_FOUND";
            throw err;
        }

        if (!session.quiz) {
            const err: any = new Error("Quiz not synced yet — admin must join first");
            err.code = "NOT_READY";
            throw err;
        }

        if (session.quiz.mode !== "FULL") {
            const err: any = new Error(
                "This session is not in full quiz mode. Use the live socket events instead.",
            );
            err.code = "WRONG_MODE";
            throw err;
        }

        return {
            eventCode,
            quizTitle: session.quiz.title,
            timed: session.quiz.timed,
            timeLimitSeconds: session.quiz.timeLimitSeconds,
            totalQuestions: session.quiz.totalQuestions,
            questions: session.quiz.questions.map((q) => ({
                index: q.index,
                text: q.text,
                options: q.options.map((o) => ({ index: o.index, text: o.text })),
            })),
        };
    }
}
