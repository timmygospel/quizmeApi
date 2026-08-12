import { BaseController } from "../../../../../shared/core/BaseController";
import { GetQuizUseCase } from "../../../application/useCases/getQuiz/GetQuizUseCase";
import { QuizMap } from "../../../mappers/QuizMap";

export class GetQuizController extends BaseController {
    constructor(private readonly useCase: GetQuizUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const quizId = String(this.req.params.id);

            const quiz = await this.useCase.execute(quizId);

            if (!quiz) {
                this.notFound("Quiz not found");
                return;
            }

            this.ok(QuizMap.toDTO(quiz));
        } catch (err) {
            if (err instanceof Error && err.message === "Quiz not found") {
                this.notFound("Quiz not found");
                return;
            }
            this.fail(err);
        }
    }
}
