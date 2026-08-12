import { BaseController } from "../../../../../shared/core/BaseController";
import { GetSessionsUseCase } from "../../../application/useCases/GetSessionsUseCase";

export class GetSessionsController extends BaseController {
    constructor(private readonly useCase: GetSessionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const trainingTemplateId = this.req.query.training_template_id
            ? String(this.req.query.training_template_id)
            : undefined;
        this.ok(await this.useCase.execute(trainingTemplateId));
    }
}
