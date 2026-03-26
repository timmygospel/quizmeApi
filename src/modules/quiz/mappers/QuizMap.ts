import { Quiz } from "../domain/Quiz";
import { Question } from "../domain/Question";
import { Option } from "../domain/Option";
import { QuizDTO } from "../application/useCases/getQuiz/GetQuizDTO";
import { QuizTitle } from "../domain/valueObjects/QuizTitle";
import { QuestionText } from "../domain/valueObjects/QuestionText";
import { OptionText } from "../domain/valueObjects/OptionText";

// Prisma shape returned by findUnique/findMany with relations
type PrismaOption = { id: string; text: string; isCorrect: boolean; index: number };
type PrismaQuestion = { id: string; text: string; index: number; options: PrismaOption[] };
type PrismaQuiz = {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
    questions: PrismaQuestion[];
};

export class QuizMap {
    // Prisma record → Domain
    public static toDomain(raw: PrismaQuiz): Quiz {
        const titleOrError = QuizTitle.create(raw.title);
        if (titleOrError.isFailure) throw new Error(titleOrError.errorValue());

        const questions = [...(raw.questions ?? [])]
            .sort((a, b) => a.index - b.index)
            .map((q) => {
                const questionTextOrError = QuestionText.create(q.text);
                if (questionTextOrError.isFailure) throw new Error(questionTextOrError.errorValue());

                const options = [...(q.options ?? [])]
                    .sort((a, b) => a.index - b.index)
                    .map((o) => {
                        const optionTextOrError = OptionText.create(o.text);
                        if (optionTextOrError.isFailure) throw new Error(optionTextOrError.errorValue());
                        return new Option({ id: o.id, text: optionTextOrError.getValue(), correct: o.isCorrect });
                    });

                return new Question({ id: q.id, question: questionTextOrError.getValue(), options });
            });

        return new Quiz({ id: raw.id, title: titleOrError.getValue(), questions, createdAt: raw.createdAt, updatedAt: raw.updatedAt });
    }

    // Domain → DTO
    public static toDTO(quiz: Quiz): QuizDTO {
        return {
            id: quiz.id!,
            title: quiz.title.value,
            questions: quiz.questions.map((q) => ({
                id: q.id,
                question: q.question.value,
                options: q.options.map((o) => ({
                    id: o.id,
                    text: o.text.value,
                    correct: o.correct,
                })),
            })),
            createdAt: quiz.createdAt.toISOString(),
            updatedAt: quiz.updatedAt.toISOString(),
        };
    }
}
