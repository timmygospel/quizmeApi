import { prisma } from "../../../../../shared/infra/prisma/prismaClient";

export interface QuestionAnalysisRowDTO {
    questionId: string;
    index: number;
    text: string;
    topicTag: string | null;
    totalAnswered: number;
    correctCount: number;
    correctPercent: number;
    difficulty: "Easy" | "Medium" | "Hard";
}

export class GetQuestionAnalysisUseCase {
    async execute(eventCode: string): Promise<QuestionAnalysisRowDTO[]> {
        const session = await prisma.quizSession.findUniqueOrThrow({
            where: { eventCode },
            select: { id: true, quizId: true },
        });

        if (!session.quizId) return [];

        // Fetch questions and use groupBy to aggregate answer counts in the DB
        const [questions, answerGroups] = await Promise.all([
            prisma.question.findMany({
                where: { quizId: session.quizId },
                orderBy: { index: "asc" },
                select: { id: true, index: true, text: true, topicTag: true },
            }),
            prisma.attemptAnswer.groupBy({
                by: ["questionId", "isCorrect"],
                where: {
                    attempt: { sessionId: session.id },
                    selectedOptionId: { not: null },
                },
                _count: { id: true },
            }),
        ]);

        // Index groupBy results by questionId
        const countMap = new Map<string, { total: number; correct: number }>();
        for (const g of answerGroups) {
            const entry = countMap.get(g.questionId) ?? { total: 0, correct: 0 };
            entry.total += g._count.id;
            if (g.isCorrect) entry.correct += g._count.id;
            countMap.set(g.questionId, entry);
        }

        return questions.map((q) => {
            const { total = 0, correct = 0 } = countMap.get(q.id) ?? {};
            const correctPercent =
                total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

            return {
                questionId: q.id,
                index: q.index,
                text: q.text,
                topicTag: q.topicTag,
                totalAnswered: total,
                correctCount: correct,
                correctPercent,
                difficulty: GetQuestionAnalysisUseCase.difficulty(correctPercent),
            };
        });
    }

    private static difficulty(
        correctPercent: number,
    ): "Easy" | "Medium" | "Hard" {
        if (correctPercent >= 75) return "Easy";
        if (correctPercent >= 50) return "Medium";
        return "Hard";
    }
}
