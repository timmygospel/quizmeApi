import { BaseController } from "../../../../../shared/core/BaseController";
import { isUuid } from "../../../../../shared/core/isUuid";
import { GetTrendsUseCase } from "../../../application/useCases/GetTrendsUseCase";

export class GetTrendsController extends BaseController {
    constructor(private readonly useCase: GetTrendsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const trainingTemplateId = String(this.req.params.id);
        if (!isUuid(trainingTemplateId)) {
            this.clientError("Invalid training template id");
            return;
        }
        this.ok(await this.useCase.execute(trainingTemplateId, this.req.effectiveScope));
    }
}
