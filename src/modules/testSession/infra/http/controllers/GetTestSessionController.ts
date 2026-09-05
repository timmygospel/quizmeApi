import { BaseController } from "../../../../../shared/core/BaseController";
import { GetTestSessionUseCase } from "../../../application/useCases/getTestSession/GetTestSessionUseCase";
import { TestSessionMap } from "../../../mappers/TestSessionMap";
import { mapFailure } from "./mapFailure";

export class GetTestSessionController extends BaseController {
    constructor(private readonly useCase: GetTestSessionUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id, this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(TestSessionMap.toDTO(result.getValue()));
    }
}
