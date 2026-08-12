import { IQuizRepository } from "../../../domain/IQuizRepository";
import { CreateQuizDTO } from "./createQuizDTO";
import { Quiz } from "../../../domain/Quiz";
import { Question } from "../../../domain/Question";
import { Option } from "../../../domain/Option";
import { QuizTitle } from "../../../domain/valueObjects/QuizTitle";
import { QuestionText } from "../../../domain/valueObjects/QuestionText";
import { OptionText } from "../../../domain/valueObjects/OptionText";
import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

export class CreateQuizUseCase implements UseCase<CreateQuizDTO, Promise<Result<Quiz>>> {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: CreateQuizDTO): Promise<Result<Quiz>> {
        try {
            // ✅ 1. Validate the Quiz title (Value Object)
            const titleOrError = QuizTitle.create(dto.title);
            if (titleOrError.isFailure) return Result.fail(titleOrError.errorValue());

            // ✅ 2. Build Questions + Options (all VOs)
            const questions = (dto.questions ?? []).map((q) => {
                const questionTextOrError = QuestionText.create(q.question);
                if (questionTextOrError.isFailure) throw new Error(questionTextOrError.errorValue());

                const options = q.options.map((o) => {
                    const optionTextOrError = OptionText.create(o.text);
                    if (optionTextOrError.isFailure) throw new Error(optionTextOrError.errorValue());
                    return new Option({ text: optionTextOrError.getValue(), correct: o.correct });
                });

                return new Question({
                    question: questionTextOrError.getValue(),
                    options,
                });
            }) || [];

            // ✅ 3. Build Sections (optional — plain data, no VO invariants beyond a name)
            const sections = (dto.sections ?? [])
                .filter((s) => s.name && s.name.trim().length > 0)
                .map((s) => ({ name: s.name.trim(), questionIds: s.questionIds ?? [] }));

            // ✅ 4. Build the Aggregate Root (Quiz)
            const quiz = new Quiz({
                title: titleOrError.getValue(),
                questions,
                sections,
            });

            // ✅ 4. Persist via Repository
            const savedQuiz = await this.quizRepo.save(quiz);

            // ✅ 5. Return success
            return Result.ok(savedQuiz);
        } catch (error) {
            return Result.fail(`Failed to create quiz: ${error}`);
        }
    }
}
