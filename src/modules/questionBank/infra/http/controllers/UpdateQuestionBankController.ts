import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateQuestionBankUseCase } from "../../../application/useCases/updateQuestion/UpdateQuestionBankUseCase";
import { QuestionBankMap } from "../../../mappers/QuestionBankMap";

export class UpdateQuestionBankController extends BaseController {
    constructor(private useCase: UpdateQuestionBankUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const id = this.req.params.id;
            const dto = { ...this.req.body, id };

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                this.clientError(result.errorValue());
                return;
            }

            this.ok(QuestionBankMap.toDTO(result.getValue()));
            return;
        } catch (err) {
            this.fail(err);
            return;
        }
    }
}
