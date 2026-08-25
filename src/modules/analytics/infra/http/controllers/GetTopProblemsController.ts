import { BaseController } from "../../../../../shared/core/BaseController";
import { isUuid } from "../../../../../shared/core/isUuid";
import { GetTopProblemsUseCase } from "../../../application/useCases/GetTopProblemsUseCase";

export class GetTopProblemsController extends BaseController {
    constructor(private readonly useCase: GetTopProblemsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        if (!isUuid(sessionId)) {
            this.clientError("Invalid session id");
            return;
        }
        this.ok(await this.useCase.execute(sessionId, this.req.effectiveScope));
    }
}
