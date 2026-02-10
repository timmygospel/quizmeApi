import { BaseController } from "../../../../../shared/core/BaseController";
import { GetQuizUseCase } from "../../../application/useCases/getQuiz/GetQuizUseCase";
import { Result } from "../../../../../shared/core/Result";

export class GetQuizController extends BaseController {
    constructor(private useCase: GetQuizUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const quizId = this.req.params.id;

            const result: Result<any> = await this.useCase.execute({ id: quizId });

            if (result.isFailure) {
                return this.notFound(result.errorValue());
            }

            return this.ok(result.getValue());
        } catch (err) {
            return this.fail(err);
        }
    }
}
