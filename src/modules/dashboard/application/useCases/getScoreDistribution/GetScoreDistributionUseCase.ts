import { prisma } from "../../../../../shared/infra/prisma/prismaClient";

export interface ScoreBinDTO {
    /** Lower bound of the bin, e.g. 0 means the 0–9 bucket */
    binStart: number;
    /** Upper bound label, e.g. 9 */
    binEnd: number;
    count: number;
    /** "pass" | "near" (within 10% of passingScore) | "fail" */
    category: "pass" | "near" | "fail";
}

export interface ScoreDistributionDTO {
    bins: ScoreBinDTO[];
    passingScore: number;
}

export class GetScoreDistributionUseCase {
    async execute(eventCode: string): Promise<ScoreDistributionDTO> {
        const session = await prisma.quizSession.findUniqueOrThrow({
            where: { eventCode },
            include: {
                quiz: { select: { passingScore: true } },
                attempts: {
                    where: { status: "COMPLETED" },
                    select: { totalScore: true },
                },
            },
        });

        const passingScore = session.quiz?.passingScore ?? 70;

        // Initialise 10 bins: 0–9, 10–19, … 90–100
        const bins: ScoreBinDTO[] = Array.from({ length: 10 }, (_, i) => {
            const binStart = i * 10;
            const binEnd = i === 9 ? 100 : binStart + 9;
            const category: ScoreBinDTO["category"] =
                binStart >= passingScore
                    ? "pass"
                    : binStart >= passingScore - 10
                    ? "near"
                    : "fail";
            return { binStart, binEnd, count: 0, category };
        });

        for (const { totalScore } of session.attempts) {
            if (totalScore === null) continue;
            // Clamp to 0–100 then assign to bin
            const clamped = Math.max(0, Math.min(100, totalScore));
            const binIndex = clamped === 100 ? 9 : Math.floor(clamped / 10);
            bins[binIndex].count += 1;
        }

        return { bins, passingScore };
    }
}
