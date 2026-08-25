import { BaseController } from "../../../../../shared/core/BaseController";
import { isUuid } from "../../../../../shared/core/isUuid";
import { GetSessionSummaryUseCase } from "../../../application/useCases/GetSessionSummaryUseCase";

export class GetSessionSummaryController extends BaseController {
    constructor(private readonly useCase: GetSessionSummaryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        if (!isUuid(sessionId)) {
            this.clientError("Invalid session id");
            return;
        }
        const summary = await this.useCase.execute(sessionId, this.req.effectiveScope);

        if (!summary) {
            this.notFound("Session not found");
            return;
        }

        this.ok(summary);
    }
}
