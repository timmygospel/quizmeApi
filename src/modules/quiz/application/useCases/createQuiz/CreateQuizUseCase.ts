import { IQuizRepository } from "../../../domain/IQuizRepository";
import { CreateQuizDTO } from "./createQuizDTO";
import { Quiz } from "../../../domain/Quiz";
import { QuizTitle } from "../../../domain/valueObjects/QuizTitle";
import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { buildQuizContent } from "../shared/buildQuizContent";

export class CreateQuizUseCase implements UseCase<CreateQuizDTO, Promise<Result<Quiz>>> {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: CreateQuizDTO): Promise<Result<Quiz>> {
        try {
            // ✅ 1. Validate the Quiz title (Value Object)
            const titleOrError = QuizTitle.create(dto.title);
            if (titleOrError.isFailure) return Result.fail(titleOrError.errorValue());

            // ✅ 2. Build Questions + Sections — client question/section ids are kept,
            // so questions can be assigned to sections before the quiz is first saved
            const contentOrError = await buildQuizContent(this.quizRepo, {
                questions: dto.questions ?? [],
                sections: dto.sections ?? [],
            });
            if (contentOrError.isFailure) return Result.fail(contentOrError.errorValue());
            const { questions, sections } = contentOrError.getValue();

            // ✅ 3. Build the Aggregate Root (Quiz)
            const quiz = new Quiz({
                title: titleOrError.getValue(),
                questions,
                sections,
            });

            // ✅ 4. Persist via Repository
            const savedQuiz = await this.quizRepo.save(quiz);

            // ✅ 5. Return success
            return Result.ok(savedQuiz);
        } catch (error: any) {
            return Result.fail(`UNEXPECTED: Failed to create quiz: ${error?.message ?? error}`);
        }
    }
}
