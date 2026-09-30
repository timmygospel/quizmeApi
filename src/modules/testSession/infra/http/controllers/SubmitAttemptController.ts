import { BaseController } from "../../../../../shared/core/BaseController";
import { SubmitAttemptUseCase } from "../../../application/useCases/submitAttempt/SubmitAttemptUseCase";
import { GetAttemptResultUseCase } from "../../../application/useCases/getAttemptResult/GetAttemptResultUseCase";
import { mapFailure } from "./mapFailure";

export class SubmitAttemptController extends BaseController {
    constructor(
        private readonly useCase: SubmitAttemptUseCase,
        private readonly getResult: GetAttemptResultUseCase
    ) {
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

        // The participant sees only what the assessment's result visibility allows.
        const visible = await this.getResult.execute(attemptId, userId);
        if (visible.isFailure) {
            mapFailure(this, visible.errorValue());
            return;
        }
        this.ok(visible.getValue());
    }
}
