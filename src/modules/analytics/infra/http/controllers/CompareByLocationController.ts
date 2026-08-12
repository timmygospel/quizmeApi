import { BaseController } from "../../../../../shared/core/BaseController";
import { CompareByLocationUseCase } from "../../../application/useCases/CompareByLocationUseCase";

export class CompareByLocationController extends BaseController {
    constructor(private readonly useCase: CompareByLocationUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        this.ok(await this.useCase.execute(sessionId));
    }
}
