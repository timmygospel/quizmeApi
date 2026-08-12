import { BaseController } from "../../../../../shared/core/BaseController";
import { GetTrendsUseCase } from "../../../application/useCases/GetTrendsUseCase";

export class GetTrendsController extends BaseController {
    constructor(private readonly useCase: GetTrendsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const trainingTemplateId = String(this.req.params.id);
        this.ok(await this.useCase.execute(trainingTemplateId));
    }
}
