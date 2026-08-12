import { BaseController } from "../../../../../shared/core/BaseController";
import { CompareByDepartmentUseCase } from "../../../application/useCases/CompareByDepartmentUseCase";

export class CompareByDepartmentController extends BaseController {
    constructor(private readonly useCase: CompareByDepartmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        this.ok(await this.useCase.execute(sessionId));
    }
}
