import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllQuestionBankUseCase } from "../../../application/useCases/getAllQuestions/GetAllQuestionBankUseCase";
import { QuestionBankMap } from "../../../mappers/QuestionBankMap";

export class GetAllQuestionBankController extends BaseController {
    constructor(private useCase: GetAllQuestionBankUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const categoryId = this.req.query.categoryId
                ? String(this.req.query.categoryId)
                : undefined;

            const result = await this.useCase.execute(categoryId);

            if (result.isFailure) {
                this.fail(result.errorValue());
                return;
            }

            const dtos = result.getValue().map(QuestionBankMap.toDTO);
            this.ok(dtos);
            return;
        } catch (err) {
            this.fail(err);
            return;
        }
    }
}
