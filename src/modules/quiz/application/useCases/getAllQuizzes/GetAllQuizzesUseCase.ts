import { IQuizRepository } from "../../../domain/IQuizRepository";
import { Quiz } from "../../../domain/Quiz";
import { UseCase } from "../../../../../shared/core/UseCase";
import { Result } from "../../../../../shared/core/Result";

/**
 * Returns domain Quiz aggregates. Controllers MUST map these through
 * QuizMap.toDTO before serializing — Quiz/Question/Option fields are
 * Value Object instances (e.g. `title.value`), not plain strings.
 */
export class GetAllQuizzesUseCase implements UseCase<void, Result<Quiz[]>> {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(): Promise<Result<Quiz[]>> {
        try {
            const quizzes = await this.quizRepo.findAll();
            return Result.ok<Quiz[]>(quizzes);
        } catch (error) {
            console.error("[GetAllQuizzesUseCase] Error:", error);
            return Result.fail<Quiz[]>("Failed to retrieve quizzes");
        }
    }
}
