import { Quiz } from "../domain/Quiz";
import { Question } from "../domain/Question";
import { Option } from "../domain/Option";
import { IQuizDocument } from "../infra/db/QuizModel";
import { QuizDTO } from "../application/useCases/getQuiz/GetQuizDTO";
import { QuizTitle } from "../domain/valueObjects/QuizTitle";
import { QuestionText } from "../domain/valueObjects/QuestionText";
import { OptionText } from "../domain/valueObjects/OptionText";

export class QuizMap {
    // ✅ Mongo Document → Domain
    public static toDomain(raw: IQuizDocument): Quiz {
        const titleOrError = QuizTitle.create(raw.title);
        if (titleOrError.isFailure) throw new Error(titleOrError.errorValue());

        const questions = raw.questions.map((q) => {
            const questionTextOrError = QuestionText.create(q.question);
            if (questionTextOrError.isFailure) throw new Error(questionTextOrError.errorValue());

            const options = q.options.map((o) => {
                const optionTextOrError = OptionText.create(o.text);
                if (optionTextOrError.isFailure) throw new Error(optionTextOrError.errorValue());

                return new Option({
                    id: o._id?.toString(),
                    text: optionTextOrError.getValue(),
                    correct: o.correct,
                });
            });

            return new Question({
                id: q._id?.toString(),
                question: questionTextOrError.getValue(),
                options,
            });
        });

        return new Quiz({
            id: raw._id?.toString(),
            title: titleOrError.getValue(),
            questions,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
        });
    }

    // ✅ Domain → Mongo
    public static toPersistence(quiz: Quiz): any {
        return {
            title: quiz.title.value,
            questions: quiz.questions.map((q) => ({
                question: q.question.value,
                options: q.options.map((o) => ({
                    text: o.text.value,
                    correct: o.correct,
                })),
            })),
        };
    }

    // ✅ Domain → DTO
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
