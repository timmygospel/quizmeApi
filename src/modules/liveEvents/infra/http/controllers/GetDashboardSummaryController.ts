import { BaseController } from "../../../../../shared/core/BaseController";
import { GetLiveEventSummaryUseCase } from "../../../application/useCases/getSummary/GetLiveEventSummaryUseCase";

export class GetDashboardSummaryController extends BaseController {
    constructor(private readonly useCase: GetLiveEventSummaryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const eventCode = String(this.req.params.eventCode ?? "").trim().toUpperCase();
        const summary = await this.useCase.execute(eventCode);

        if (!summary) {
            this.notFound("Live event not found");
            return;
        }

        this.ok(summary);
    }
}
