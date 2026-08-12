import { BaseController } from "../../../../../shared/core/BaseController";
import { GetTopProblemsUseCase } from "../../../application/useCases/GetTopProblemsUseCase";

export class GetTopProblemsController extends BaseController {
    constructor(private readonly useCase: GetTopProblemsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const sessionId = String(this.req.params.id);
        this.ok(await this.useCase.execute(sessionId));
    }
}
