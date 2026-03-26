import { IQuestionBankRepository } from "../../domain/IQuestionBankRepository";
import { QuestionBankQuestion } from "../../domain/QuestionBankQuestion";
import { QuestionBankMap } from "../../mappers/QuestionBankMap";
import { prisma } from "../../../../shared/infra/prisma/prismaClient";

const include = {
    options: { orderBy: { index: "asc" as const } },
};

export class PrismaQuestionBankRepository implements IQuestionBankRepository {
    async findById(id: string): Promise<QuestionBankQuestion | null> {
        const row = await prisma.questionBankQuestion.findUnique({ where: { id }, include });
        return row ? QuestionBankMap.toDomain(row) : null;
    }

    async findAll(categoryId?: string): Promise<QuestionBankQuestion[]> {
        const rows = await prisma.questionBankQuestion.findMany({
            where: categoryId ? { categoryId } : undefined,
            include,
            orderBy: { createdAt: "desc" },
        });
        return rows.map(QuestionBankMap.toDomain);
    }

    async save(question: QuestionBankQuestion): Promise<QuestionBankQuestion> {
        const optionsPayload = question.options.map((o, i) => ({
            text: o.text,
            correct: o.correct,
            index: i,
        }));

        if (question.id) {
            await prisma.questionBankOption.deleteMany({ where: { questionId: question.id } });
            const updated = await prisma.questionBankQuestion.update({
                where: { id: question.id },
                data: {
                    question: question.question,
                    categoryId: question.categoryId ?? null,
                    options: { create: optionsPayload },
                },
                include,
            });
            return QuestionBankMap.toDomain(updated);
        }

        const created = await prisma.questionBankQuestion.create({
            data: {
                question: question.question,
                categoryId: question.categoryId ?? null,
                options: { create: optionsPayload },
            },
            include,
        });
        return QuestionBankMap.toDomain(created);
    }

    async delete(id: string): Promise<void> {
        await prisma.questionBankQuestion.delete({ where: { id } });
    }
}
