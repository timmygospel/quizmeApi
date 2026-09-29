import { IQuizRepository } from "../../../domain/IQuizRepository";
import { UpdateQuizDTO } from "./UpdateQuizDTO";
import { UseCase } from "../../../../../shared/core/UseCase";
import { Result } from "../../../../../shared/core/Result";
import { Quiz } from "../../../domain/Quiz";
import { QuizTitle } from "../../../domain/valueObjects/QuizTitle";
import { buildQuizContent } from "../shared/buildQuizContent";

/**
 * Upserts the quiz's questions and sections. Sections omitted from
 * `sections` are deleted; their questions stay in the quiz, Unassigned.
 */
export class UpdateQuizUseCase implements UseCase<UpdateQuizDTO, Promise<Result<Quiz>>> {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: UpdateQuizDTO): Promise<Result<Quiz>> {
        try {
            // ✅ 1. Find existing quiz
            const existingQuiz = await this.quizRepo.findById(dto.id);
            if (!existingQuiz) {
                return Result.fail(`NOT_FOUND: Quiz with id ${dto.id} not found`);
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

            // ✅ 3. Map and validate questions + sections (each only if provided)
            const contentOrError = await buildQuizContent(this.quizRepo, {
                quizId: existingQuiz.id,
                questions: dto.questions,
                sections: dto.sections,
                existing: existingQuiz,
            });
            if (contentOrError.isFailure) return Result.fail(contentOrError.errorValue());
            const { questions, sections } = contentOrError.getValue();

            // ✅ 4. Build updated domain object
            const updatedQuiz = new Quiz({
                id: existingQuiz.id,
                title,
                questions,
                sections,
                createdAt: existingQuiz.createdAt,
                updatedAt: new Date(),
            });

            // ✅ 5. Persist update
            const savedQuiz = await this.quizRepo.save(updatedQuiz);

            // ✅ 6. Return success
            return Result.ok(savedQuiz);
        } catch (error: any) {
            return Result.fail(`UNEXPECTED: Failed to update quiz: ${error?.message ?? error}`);
        }
    }
}
