import { IQuizRepository } from "../../domain/IQuizRepository";
import { Quiz } from "../../domain/Quiz";
import { QuizModel, IQuizDocument } from "./QuizModel";
import { QuizMap } from "../../mappers/QuizMap";

export class MongoQuizRepository implements IQuizRepository {
    async findById(id: string): Promise<Quiz | null> {
        const quizDoc = await QuizModel.findById(id).exec();
        return quizDoc ? QuizMap.toDomain(quizDoc as IQuizDocument) : null;
    }

    async findAll(): Promise<Quiz[]> {
        const quizDocs = await QuizModel.find().exec();
        return quizDocs.map((doc) => QuizMap.toDomain(doc as IQuizDocument));
    }

    async save(quiz: Quiz): Promise<Quiz> {
        const raw = QuizMap.toPersistence(quiz);

        // If quiz already exists → update it
        if (quiz.id) {
            const updatedDoc = await QuizModel.findByIdAndUpdate(quiz.id, raw, {
                new: true,
                upsert: true,
            }).exec();

            if (!updatedDoc) throw new Error("Quiz not found after update");
            return QuizMap.toDomain(updatedDoc);
        }

        // If new → create
        const createdDoc = await QuizModel.create(raw);
        return QuizMap.toDomain(createdDoc);
    }

    async delete(id: string): Promise<void> {
        await QuizModel.findByIdAndDelete(id).exec();
    }
}
