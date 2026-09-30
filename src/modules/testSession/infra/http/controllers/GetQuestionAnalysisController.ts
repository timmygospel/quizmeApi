import { BaseController } from "../../../../../shared/core/BaseController";
import { GetQuestionAnalysisUseCase } from "../../../application/useCases/getQuestionAnalysis/GetQuestionAnalysisUseCase";
import { mapFailure } from "./mapFailure";

export class GetQuestionAnalysisController extends BaseController {
    constructor(private readonly useCase: GetQuestionAnalysisUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.useCase.execute(String(this.req.params.id), this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue());
    }
}
