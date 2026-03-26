import { prisma } from "../../../../../shared/infra/prisma/prismaClient";

export interface SessionSummaryDTO {
    sessionId: string;
    eventCode: string;
    title: string;
    status: string;
    startedAt: Date;
    endedAt: Date | null;
    totalParticipants: number;
    completedParticipants: number;
    completionRate: number;
    averageScore: number | null;
    passRate: number | null;
    passingScore: number;
}

export class GetSessionSummaryUseCase {
    async execute(eventCode: string): Promise<SessionSummaryDTO> {
        const session = await prisma.quizSession.findUniqueOrThrow({
            where: { eventCode },
            select: {
                id: true,
                eventCode: true,
                title: true,
                status: true,
                startedAt: true,
                endedAt: true,
                quiz: { select: { passingScore: true } },
            },
        });

        // Single round-trip: count + avg in one aggregate call, pass count in parallel
        const [completedAgg, totalCount, passedCount] = await Promise.all([
            prisma.attempt.aggregate({
                where: { sessionId: session.id, status: "COMPLETED" },
                _count: { id: true },
                _avg: { totalScore: true },
            }),
            prisma.attempt.count({ where: { sessionId: session.id } }),
            prisma.attempt.count({
                where: { sessionId: session.id, status: "COMPLETED", passed: true },
            }),
        ]);

        const completedCount = completedAgg._count.id;
        const rawAvg = completedAgg._avg.totalScore;

        const averageScore =
            rawAvg !== null
                ? Math.round(rawAvg * 100) / 100
                : null;

        const passRate =
            completedCount > 0
                ? Math.round((passedCount / completedCount) * 10000) / 100
                : null;

        const completionRate =
            totalCount > 0
                ? Math.round((completedCount / totalCount) * 10000) / 100
                : 0;

        return {
            sessionId: session.id,
            eventCode: session.eventCode,
            title: session.title ?? "",
            status: session.status,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            totalParticipants: totalCount,
            completedParticipants: completedCount,
            completionRate,
            averageScore,
            passRate,
            passingScore: session.quiz?.passingScore ?? 70,
        };
    }
}
