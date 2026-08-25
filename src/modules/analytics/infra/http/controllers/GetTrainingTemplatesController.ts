import { BaseController } from "../../../../../shared/core/BaseController";
import { GetTrainingTemplatesUseCase } from "../../../application/useCases/GetTrainingTemplatesUseCase";

export class GetTrainingTemplatesController extends BaseController {
    constructor(private readonly useCase: GetTrainingTemplatesUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        this.ok(await this.useCase.execute(this.req.effectiveScope));
    }
}
