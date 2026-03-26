import { prisma } from "../../../../../shared/infra/prisma/prismaClient";
import { Prisma } from "../../../../../generated/prisma/client";

export interface TopicBreakdownRowDTO {
    topicTag: string;
    participantsAnswered: number;
    avgScore: number;       // percentage 0–100, rounded to 2dp
    passRate: number | null;
}

type TopicRow = {
    topic_tag: string | null;
    participants: bigint;
    correct_count: bigint;
    total_count: bigint;
};

export class GetTopicBreakdownUseCase {
    async execute(eventCode: string): Promise<TopicBreakdownRowDTO[]> {
        const session = await prisma.quizSession.findUniqueOrThrow({
            where: { eventCode },
            select: {
                id: true,
                quizId: true,
                quiz: { select: { passingScore: true } },
            },
        });

        if (!session.quizId) return [];

        const passingScore = session.quiz?.passingScore ?? 70;

        // Single SQL aggregation: group by topicTag, count distinct participants,
        // sum correct answers and total answers — avoids pulling all rows into JS
        const rows = await prisma.$queryRaw<TopicRow[]>(
            Prisma.sql`
                SELECT
                    q.topic_tag,
                    COUNT(DISTINCT aa.attempt_id)                          AS participants,
                    SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)        AS correct_count,
                    COUNT(aa.id)                                           AS total_count
                FROM   "AttemptAnswer" aa
                JOIN   "Question"      q  ON q.id = aa.question_id
                JOIN   "Attempt"       a  ON a.id = aa.attempt_id
                WHERE  a.session_id         = ${session.id}
                  AND  aa.selected_option_id IS NOT NULL
                GROUP  BY q.topic_tag
                ORDER  BY
                    CASE WHEN COUNT(aa.id) = 0 THEN 0
                         ELSE SUM(CASE WHEN aa.is_correct THEN 1 ELSE 0 END)::float
                              / COUNT(aa.id)
                    END ASC
            `,
        );

        return rows.map((r) => {
            const total = Number(r.total_count);
            const correct = Number(r.correct_count);
            const avgScore =
                total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

            return {
                topicTag: r.topic_tag ?? "Untagged",
                participantsAnswered: Number(r.participants),
                avgScore,
                passRate: avgScore >= passingScore ? 100 : 0,
            };
        });
    }
}
