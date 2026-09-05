import { BaseController } from "../../../../../shared/core/BaseController";
import { SubmitAttemptUseCase } from "../../../application/useCases/submitAttempt/SubmitAttemptUseCase";
import { AttemptMap } from "../../../mappers/AttemptMap";
import { mapFailure } from "./mapFailure";

export class SubmitAttemptController extends BaseController {
    constructor(private readonly useCase: SubmitAttemptUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const attemptId = String(this.req.params.attemptId);
        const userId = this.req.authUser!.id!;

        const result = await this.useCase.execute(attemptId, userId);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        this.ok(AttemptMap.toDTO(result.getValue()));
    }
}
