import { BaseController } from "../../../../../shared/core/BaseController";
import { GetLiveEventQuestionAnalysisUseCase } from "../../../application/useCases/getQuestionAnalysis/GetLiveEventQuestionAnalysisUseCase";

export class GetDashboardQuestionsController extends BaseController {
    constructor(private readonly useCase: GetLiveEventQuestionAnalysisUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const eventCode = String(this.req.params.eventCode ?? "").trim().toUpperCase();
        const table = await this.useCase.execute(eventCode);
        this.ok(table);
    }
}
