import { BaseController } from "../../../../../shared/core/BaseController";
import { GetUserEffectiveAccessUseCase } from "../../../application/useCases/getUserEffectiveAccess/GetUserEffectiveAccessUseCase";

export class GetUserEffectiveAccessController extends BaseController {
    constructor(private readonly useCase: GetUserEffectiveAccessUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const userId = String(this.req.params.id);
        const result = await this.useCase.execute(userId);

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "USER_NOT_FOUND") {
                this.notFound(`User with id ${userId} not found`);
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(result.getValue());
    }
}
