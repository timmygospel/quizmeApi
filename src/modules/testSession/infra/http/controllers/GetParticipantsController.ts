import { BaseController } from "../../../../../shared/core/BaseController";
import { GetParticipantsUseCase } from "../../../application/useCases/getParticipants/GetParticipantsUseCase";
import { mapFailure } from "./mapFailure";

export class GetParticipantsController extends BaseController {
    constructor(private readonly useCase: GetParticipantsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id, this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue());
    }
}
