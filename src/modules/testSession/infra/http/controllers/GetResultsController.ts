import { BaseController } from "../../../../../shared/core/BaseController";
import { GetResultsUseCase } from "../../../application/useCases/getResults/GetResultsUseCase";
import { mapFailure } from "./mapFailure";

export class GetResultsController extends BaseController {
    constructor(private readonly useCase: GetResultsUseCase) {
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
