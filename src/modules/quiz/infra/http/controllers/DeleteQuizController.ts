import { BaseController } from "../../../../../shared/core/BaseController";
import { DeleteQuizUseCase } from "../../../application/useCases/deleteQuiz/DeleteQuizUseCase";
import { DeleteQuizDTO } from "../../../application/useCases/deleteQuiz/DeleteQuizDTO";

export class DeleteQuizController extends BaseController {
    constructor(private useCase: DeleteQuizUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const dto: DeleteQuizDTO = { id: this.req.params.id };

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                return this.clientError(result.errorValue());
            }

            return this.ok({ message: "Quiz deleted successfully" });
        } catch (err) {
            return this.fail(err);
        }
    }
}
