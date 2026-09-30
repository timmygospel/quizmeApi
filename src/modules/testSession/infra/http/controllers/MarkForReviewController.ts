import { BaseController } from "../../../../../shared/core/BaseController";
import { MarkForReviewUseCase } from "../../../application/useCases/markForReview/MarkForReviewUseCase";
import { mapFailure } from "./mapFailure";

export class MarkForReviewController extends BaseController {
    constructor(private readonly useCase: MarkForReviewUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const attemptId = String(this.req.params.attemptId);
        const questionId = String(this.req.params.questionId);
        const userId = this.req.authUser!.id!;
        const marked = this.req.body?.marked;
        if (typeof marked !== "boolean") {
            this.clientError("marked must be true or false");
            return;
        }

        const result = await this.useCase.execute(attemptId, questionId, userId, marked);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        this.ok({ questionId, markedForReview: marked });
    }
}
