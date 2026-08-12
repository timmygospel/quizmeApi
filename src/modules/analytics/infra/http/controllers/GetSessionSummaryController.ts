import { BaseController } from "../../../../../shared/core/BaseController";
import { GetSessionSummaryUseCase } from "../../../application/useCases/GetSessionSummaryUseCase";

export class GetSessionSummaryController extends BaseController {
    constructor(private readonly useCase: GetSessionSummaryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        const summary = await this.useCase.execute(sessionId);

        if (!summary) {
            this.notFound("Session not found");
            return;
        }

        this.ok(summary);
    }
}
