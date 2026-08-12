import { BaseController } from "../../../../../shared/core/BaseController";
import { GetSessionAlertsUseCase } from "../../../application/useCases/GetSessionAlertsUseCase";

export class GetSessionAlertsController extends BaseController {
    constructor(private readonly useCase: GetSessionAlertsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        this.ok(await this.useCase.execute(sessionId));
    }
}
