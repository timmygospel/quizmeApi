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

            const outcome = await this.useCase.execute(dto);

            if (!outcome.ok) {
                switch (outcome.error) {
                    case "QUIZ_NOT_FOUND":
                        return this.notFound(`Knowledge Module with id ${dto.id} not found`);
                    case "QUIZ_IN_USE":
                        return this.conflict(outcome.message);
                }
            }

            return this.ok({ message: "Knowledge Module deleted successfully" });
        } catch (err) {
            return this.fail(err);
        }
    }
}
