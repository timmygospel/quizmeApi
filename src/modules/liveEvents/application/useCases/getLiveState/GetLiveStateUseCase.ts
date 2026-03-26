import { prisma } from "../../../../../shared/infra/prisma/prismaClient";
import { redis } from "../../../../../shared/infra/redis/redisClient";

export interface AnswerDistributionItemDTO {
    optionIndex: number;
    text: string;
    count: number;
    percent: number;
    isCorrect: boolean;
}

export interface LiveStateDTO {
    eventCode: string;
    name: string;
    status: string;
    activeQuestionIndex: number;
    questionVisible: boolean;
    totalParticipants: number;
    activeQuestion: {
        index: number;
        text: string;
        totalAnswered: number;
        answerDistribution: AnswerDistributionItemDTO[];
    } | null;
}

const redisKey = {
    active: (code: string) => `event:${code}:active`,
    quiz:   (code: string) => `event:${code}:quiz`,
    counts: (code: string, qIdx: number) => `event:${code}:counts:${qIdx}`,
};

export class GetLiveStateUseCase {
    async execute(eventCode: string): Promise<LiveStateDTO> {
        const session = await prisma.quizSession.findUnique({
            where: { eventCode },
            include: { _count: { select: { attempts: true } } },
        });

        if (!session) {
            const err: any = new Error("Live event not found");
            err.code = "NOT_FOUND";
            throw err;
        }

        // Read active state from Redis (authoritative during live sessions)
        let activeQuestionIndex = session.activeQuestionIndex;
        let questionVisible = session.questionVisible;

        if (redis) {
            const raw = await redis.get(redisKey.active(eventCode));
            if (raw) {
                const state = JSON.parse(raw);
                activeQuestionIndex = state.activeQuestionIndex ?? activeQuestionIndex;
                questionVisible = state.questionVisible ?? questionVisible;
            }
        }

        // Read quiz snapshot from Redis to get question text + option info
        let quizSnapshot: any = null;
        if (redis) {
            const raw = await redis.get(redisKey.quiz(eventCode));
            if (raw) quizSnapshot = JSON.parse(raw);
        }

        const activeQ = quizSnapshot?.questions?.[activeQuestionIndex] ?? null;

        let activeQuestion: LiveStateDTO["activeQuestion"] = null;
        if (activeQ) {
            const counts = new Array(activeQ.options.length).fill(0);

            if (redis) {
                const raw = await redis.hgetall(redisKey.counts(eventCode, activeQuestionIndex));
                for (const [optStr, countStr] of Object.entries(raw ?? {})) {
                    const idx = Number(optStr);
                    const cnt = Number(countStr);
                    if (!Number.isNaN(idx) && idx >= 0 && idx < counts.length) {
                        counts[idx] = cnt;
                    }
                }
            }

            const totalAnswered = counts.reduce((a: number, b: number) => a + b, 0);

            const answerDistribution: AnswerDistributionItemDTO[] = activeQ.options.map(
                (opt: any, i: number) => ({
                    optionIndex: i,
                    text: opt.text,
                    count: counts[i],
                    percent: totalAnswered > 0 ? Math.round((counts[i] / totalAnswered) * 10000) / 100 : 0,
                    isCorrect: i === activeQ.correctIndex,
                }),
            );

            activeQuestion = { index: activeQuestionIndex, text: activeQ.question, totalAnswered, answerDistribution };
        }

        return {
            eventCode: session.eventCode,
            name: session.name,
            status: session.status === "ACTIVE" ? "live" : "ended",
            activeQuestionIndex,
            questionVisible,
            totalParticipants: session._count.attempts,
            activeQuestion: questionVisible ? activeQuestion : null,
        };
    }
}
