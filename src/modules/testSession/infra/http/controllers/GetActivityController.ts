import { BaseController } from "../../../../../shared/core/BaseController";
import { GetActivityUseCase } from "../../../application/useCases/getActivity/GetActivityUseCase";
import { mapFailure } from "./mapFailure";

export class GetActivityController extends BaseController {
    constructor(private readonly useCase: GetActivityUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.useCase.execute(String(this.req.params.id), this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue());
    }
}
