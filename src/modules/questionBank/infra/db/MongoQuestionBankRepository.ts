import { IQuestionBankRepository } from "../../domain/IQuestionBankRepository";
import { QuestionBankQuestion } from "../../domain/QuestionBankQuestion";
import { QuestionBankModel, IQuestionBankDocument } from "./QuestionBankModel";
import { QuestionBankMap } from "../../mappers/QuestionBankMap";

export class MongoQuestionBankRepository implements IQuestionBankRepository {
    async findById(id: string): Promise<QuestionBankQuestion | null> {
        const doc = await QuestionBankModel.findById(id).exec();
        return doc ? QuestionBankMap.toDomain(doc as IQuestionBankDocument) : null;
    }

    async findAll(categoryId?: string): Promise<QuestionBankQuestion[]> {
        const query: any = {};
        if (categoryId) query.categoryId = categoryId;

        const docs = await QuestionBankModel.find(query).exec();
        return docs.map((d) => QuestionBankMap.toDomain(d as IQuestionBankDocument));
    }

    async save(question: QuestionBankQuestion): Promise<QuestionBankQuestion> {
        const raw = QuestionBankMap.toPersistence(question);

        if (question.id) {
            const updated = await QuestionBankModel.findByIdAndUpdate(question.id, raw, {
                new: true,
                runValidators: true,
            }).exec();

            if (!updated) throw new Error("Question not found after update");
            return QuestionBankMap.toDomain(updated);
        }

        const created = await QuestionBankModel.create(raw);
        return QuestionBankMap.toDomain(created);
    }

    async delete(id: string): Promise<void> {
        await QuestionBankModel.findByIdAndDelete(id).exec();
    }
}
