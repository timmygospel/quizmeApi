import { BaseController } from "../../../../../shared/core/BaseController";
import { GetQuestionAnalysisUseCase } from "../../../application/useCases/getQuestionAnalysis/GetQuestionAnalysisUseCase";

export class GetQuestionAnalysisController extends BaseController {
    constructor(private useCase: GetQuestionAnalysisUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const { eventCode } = this.req.params;
        try {
            const dto = await this.useCase.execute(eventCode);
            this.ok(dto);
        } catch (err: any) {
            if (err?.code === "P2025") {
                this.notFound(`Session '${eventCode}' not found`);
            } else {
                this.fail(err);
            }
        }
    }
}
