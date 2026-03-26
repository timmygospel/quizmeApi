import { prisma } from "../../../../../shared/infra/prisma/prismaClient";

export interface ParticipantRowDTO {
    attemptId: string;
    displayName: string;
    totalScore: number | null;
    passed: boolean | null;
    status: string;
    answeredQuestions: number;
    startedAt: Date;
    completedAt: Date | null;
}

export interface ParticipantTableDTO {
    rows: ParticipantRowDTO[];
    total: number;
    page: number;
    pageSize: number;
}

export interface GetParticipantTableRequest {
    eventCode: string;
    page?: number;
    pageSize?: number;
    sortBy?: "displayName" | "totalScore" | "completedAt";
    sortDir?: "asc" | "desc";
    search?: string;
}

export class GetParticipantTableUseCase {
    async execute(req: GetParticipantTableRequest): Promise<ParticipantTableDTO> {
        const page = Math.max(1, req.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, req.pageSize ?? 25));
        const sortBy = req.sortBy ?? "displayName";
        const sortDir = req.sortDir ?? "asc";

        const session = await prisma.quizSession.findUniqueOrThrow({
            where: { eventCode: req.eventCode },
            select: { id: true },
        });

        const where = {
            sessionId: session.id,
            ...(req.search
                ? {
                      displayName: {
                          contains: req.search,
                          mode: "insensitive" as const,
                      },
                  }
                : {}),
        };

        const [total, attempts] = await Promise.all([
            prisma.attempt.count({ where }),
            prisma.attempt.findMany({
                where,
                orderBy: { [sortBy]: sortDir },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    _count: { select: { answers: true } },
                },
            }),
        ]);

        const rows: ParticipantRowDTO[] = attempts.map((a) => ({
            attemptId: a.id,
            displayName: a.displayName,
            totalScore: a.totalScore,
            passed: a.passed,
            status: a.status,
            answeredQuestions: a._count.answers,
            startedAt: a.startedAt,
            completedAt: a.completedAt,
        }));

        return { rows, total, page, pageSize };
    }
}
