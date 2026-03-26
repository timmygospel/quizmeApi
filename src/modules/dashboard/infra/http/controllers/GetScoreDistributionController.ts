import { BaseController } from "../../../../../shared/core/BaseController";
import { GetScoreDistributionUseCase } from "../../../application/useCases/getScoreDistribution/GetScoreDistributionUseCase";

export class GetScoreDistributionController extends BaseController {
    constructor(private useCase: GetScoreDistributionUseCase) {
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
