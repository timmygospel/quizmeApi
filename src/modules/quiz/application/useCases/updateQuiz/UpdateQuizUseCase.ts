import { IQuizRepository } from "../../../domain/IQuizRepository";
import { UpdateQuizDTO } from "./UpdateQuizDTO";
import { UseCase } from "../../../../../shared/core/UseCase";
import { Result } from "../../../../../shared/core/Result";
import { Quiz } from "../../../domain/Quiz";
import { QuizTitle } from "../../../domain/valueObjects/QuizTitle";
import { Question } from "../../../domain/Question";
import { QuestionText } from "../../../domain/valueObjects/QuestionText";
import { Option } from "../../../domain/Option";
import { OptionText } from "../../../domain/valueObjects/OptionText";

export class UpdateQuizUseCase implements UseCase<UpdateQuizDTO, Promise<Result<Quiz>>> {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: UpdateQuizDTO): Promise<Result<Quiz>> {
        try {
            // ✅ 1. Find existing quiz
            const existingQuiz = await this.quizRepo.findById(dto.id);
            if (!existingQuiz) {
                return Result.fail(`Quiz with id ${dto.id} not found`);
            }

            // ✅ 2. Validate title (if provided)
            let title = existingQuiz.title;
            if (dto.title) {
                const titleOrError = QuizTitle.create(dto.title);
                if (titleOrError.isFailure) {
                    return Result.fail(titleOrError.errorValue());
                }
                title = titleOrError.getValue();
            }

            // ✅ 3. Map and validate questions (if provided)
            let questions = existingQuiz.questions;
            if (dto.questions) {
                questions = dto.questions
                    .filter((q) => q.question && q.question.trim().length > 0)
                    .map((q) => {
                        const questionTextOrError = QuestionText.create(q.question);
                        if (questionTextOrError.isFailure) {
                            throw new Error(questionTextOrError.errorValue());
                        }

                        const options = q.options
                            .filter((o) => o.text && o.text.trim().length > 0)
                            .map((o) => {
                                const optionTextOrError = OptionText.create(o.text);
                                if (optionTextOrError.isFailure) {
                                    throw new Error(optionTextOrError.errorValue());
                                }

                                return new Option({
                                    id: o.id,
                                    text: optionTextOrError.getValue(),
                                    correct: o.correct,
                                });
                            });

                        return new Question({
                            id: q.id,
                            question: questionTextOrError.getValue(),
                            options,
                        });
                    });
            }

            // ✅ 4. Map and validate sections (if provided)
            let sections = existingQuiz.sections;
            if (dto.sections) {
                sections = dto.sections
                    .filter((s) => s.name && s.name.trim().length > 0)
                    .map((s) => ({ id: s.id, name: s.name.trim(), questionIds: s.questionIds ?? [] }));
            }

            // ✅ 5. Build updated domain object
            const updatedQuiz = new Quiz({
                id: existingQuiz.id,
                title,
                questions,
                sections,
                createdAt: existingQuiz.createdAt,
                updatedAt: new Date(),
            });

            // ✅ 6. Persist update
            const savedQuiz = await this.quizRepo.save(updatedQuiz);

            // ✅ 7. Return success
            return Result.ok(savedQuiz);
        } catch (error: any) {
            return Result.fail(`Failed to update quiz: ${error.message ?? error}`);
        }
    }
}
