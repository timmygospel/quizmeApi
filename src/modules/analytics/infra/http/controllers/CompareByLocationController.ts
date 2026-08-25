import { BaseController } from "../../../../../shared/core/BaseController";
import { isUuid } from "../../../../../shared/core/isUuid";
import { CompareByLocationUseCase } from "../../../application/useCases/CompareByLocationUseCase";

export class CompareByLocationController extends BaseController {
    constructor(private readonly useCase: CompareByLocationUseCase) {
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
