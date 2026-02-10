import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateQuestionBankUseCase } from "../../../application/useCases/createQuestion/CreateQuestionBankUseCase";
import { QuestionBankMap } from "../../../mappers/QuestionBankMap";

export class CreateQuestionBankController extends BaseController {
    constructor(private useCase: CreateQuestionBankUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const dto = this.req.body;

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
