import { prisma } from "../../../../../shared/infra/prisma/prismaClient";

/** Returns a UTF-8 CSV string of all participant results for the session. */
export class ExportParticipantsCsvUseCase {
    async execute(eventCode: string): Promise<{ csv: string; filename: string }> {
        const session = await prisma.quizSession.findUniqueOrThrow({
            where: { eventCode },
            select: { id: true, title: true },
        });

        const attempts = await prisma.attempt.findMany({
            where: { sessionId: session.id },
            orderBy: { displayName: "asc" },
            select: {
                displayName: true,
                totalScore: true,
                passed: true,
                status: true,
                startedAt: true,
                completedAt: true,
                _count: { select: { answers: true } },
            },
        });

        const headers = [
            "Name",
            "Score (%)",
            "Passed",
            "Status",
            "Questions Answered",
            "Started At",
            "Completed At",
        ];

        const rows = attempts.map((a) => [
            csvEscape(a.displayName),
            a.totalScore !== null ? String(a.totalScore) : "",
            a.passed !== null ? (a.passed ? "Yes" : "No") : "",
            a.status,
            String(a._count.answers),
            a.startedAt.toISOString(),
            a.completedAt?.toISOString() ?? "",
        ]);

        const csv =
            [headers, ...rows].map((r) => r.join(",")).join("\r\n") + "\r\n";

        const safeTitle = String(session.title ?? "session").replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const filename = `${safeTitle}_${eventCode}_participants.csv`;

        return { csv, filename };
    }
}

function csvEscape(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}
