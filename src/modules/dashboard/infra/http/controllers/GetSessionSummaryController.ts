import { BaseController } from "../../../../../shared/core/BaseController";
import { GetSessionSummaryUseCase } from "../../../application/useCases/getSessionSummary/GetSessionSummaryUseCase";

export class GetSessionSummaryController extends BaseController {
    constructor(private useCase: GetSessionSummaryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const { eventCode } = this.req.params;
        if (!eventCode) {
            this.clientError("eventCode is required");
            return;
        }
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
