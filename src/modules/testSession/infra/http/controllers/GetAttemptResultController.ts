import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAttemptResultUseCase } from "../../../application/useCases/getAttemptResult/GetAttemptResultUseCase";
import { mapFailure } from "./mapFailure";

export class GetAttemptResultController extends BaseController {
    constructor(private readonly useCase: GetAttemptResultUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.useCase.execute(String(this.req.params.attemptId), this.req.authUser!.id!);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue());
    }
}
