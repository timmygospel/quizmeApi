import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllTestSessionsUseCase } from "../../../application/useCases/getAllTestSessions/GetAllTestSessionsUseCase";
import { TestSessionMap } from "../../../mappers/TestSessionMap";
import { mapFailure } from "./mapFailure";

export class GetAllTestSessionsController extends BaseController {
    constructor(private readonly useCase: GetAllTestSessionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.useCase.execute(this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue().map(TestSessionMap.toDTO));
    }
}
