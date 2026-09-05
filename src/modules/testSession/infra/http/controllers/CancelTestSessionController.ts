import { BaseController } from "../../../../../shared/core/BaseController";
import { CancelTestSessionUseCase } from "../../../application/useCases/cancelTestSession/CancelTestSessionUseCase";
import { TestSessionMap } from "../../../mappers/TestSessionMap";
import { mapFailure } from "./mapFailure";

export class CancelTestSessionController extends BaseController {
    constructor(private readonly useCase: CancelTestSessionUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const actorUserId = this.req.authUser!.id!;

        const result = await this.useCase.execute(id, actorUserId, this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(TestSessionMap.toDTO(result.getValue()));
    }
}
