import { BaseController } from "../../../../../shared/core/BaseController";
import { DeleteQuestionBankUseCase } from "../../../application/useCases/deleteQuestion/DeleteQuestionBankUseCase";

export class DeleteQuestionBankController extends BaseController {
    constructor(private useCase: DeleteQuestionBankUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const id = this.req.params.id;

            const result = await this.useCase.execute({ id });

            if (result.isFailure) {
                this.clientError(result.errorValue());
                return;
            }

            this.ok({ message: "Question deleted successfully" });
            return;
        } catch (err) {
            this.fail(err);
            return;
        }
    }
}
