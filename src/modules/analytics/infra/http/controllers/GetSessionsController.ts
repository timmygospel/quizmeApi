import { BaseController } from "../../../../../shared/core/BaseController";
import { isUuid } from "../../../../../shared/core/isUuid";
import { GetSessionsUseCase } from "../../../application/useCases/GetSessionsUseCase";

export class GetSessionsController extends BaseController {
    constructor(private readonly useCase: GetSessionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const trainingTemplateId = this.req.query.training_template_id
            ? String(this.req.query.training_template_id)
            : undefined;
        if (trainingTemplateId && !isUuid(trainingTemplateId)) {
            this.clientError("Invalid training_template_id");
            return;
        }
        this.ok(await this.useCase.execute(trainingTemplateId, this.req.effectiveScope));
    }
}
