import { IQuizRepository } from "../../domain/IQuizRepository";
import { Quiz } from "../../domain/Quiz";
import { QuizMap } from "../../mappers/QuizMap";
import { prisma } from "../../../../shared/infra/prisma/prismaClient";

const include = {
    questions: {
        orderBy: { index: "asc" as const },
        include: { options: { orderBy: { index: "asc" as const } } },
    },
};

export class PrismaQuizRepository implements IQuizRepository {
    async findById(id: string): Promise<Quiz | null> {
        const row = await prisma.quiz.findUnique({ where: { id }, include });
        return row ? QuizMap.toDomain(row) : null;
    }

    async findAll(): Promise<Quiz[]> {
        const rows = await prisma.quiz.findMany({ include, orderBy: { createdAt: "desc" } });
        return rows.map(QuizMap.toDomain);
    }

    async save(quiz: Quiz): Promise<Quiz> {
        const questionsPayload = quiz.questions.map((q, qi) => ({
            text: q.question.value,
            index: qi,
            options: {
                create: q.options.map((o, oi) => ({
                    text: o.text.value,
                    isCorrect: o.correct,
                    index: oi,
                })),
            },
        }));

        if (quiz.id) {
            // Delete existing questions (options cascade) then recreate
            await prisma.question.deleteMany({ where: { quizId: quiz.id } });
            const updated = await prisma.quiz.update({
                where: { id: quiz.id },
                data: {
                    title: quiz.title.value,
                    totalQuestions: quiz.questions.length,
                    questions: { create: questionsPayload },
                },
                include,
            });
            return QuizMap.toDomain(updated);
        }

        const created = await prisma.quiz.create({
            data: {
                title: quiz.title.value,
                totalQuestions: quiz.questions.length,
                questions: { create: questionsPayload },
            },
            include,
        });
        return QuizMap.toDomain(created);
    }

    async delete(id: string): Promise<void> {
        await prisma.quiz.delete({ where: { id } });
    }
}
