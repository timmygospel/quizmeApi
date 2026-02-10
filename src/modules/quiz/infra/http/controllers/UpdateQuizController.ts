import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateQuizUseCase } from "../../../application/useCases/updateQuiz/UpdateQuizUseCase";
import { UpdateQuizDTO } from "../../../application/useCases/updateQuiz/UpdateQuizDTO";

export class UpdateQuizController extends BaseController {
    constructor(private useCase: UpdateQuizUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            // ✅ Merge the `id` from route params with the body data
            const dto: UpdateQuizDTO = {
                id: this.req.params.id,
                ...this.req.body,
            };

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            return this.ok(result.getValue());
        } catch (err) {
            return this.fail(err);
        }
    }
}


