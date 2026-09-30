import { BaseController } from "../../../../../shared/core/BaseController";
import { StartAttemptUseCase } from "../../../application/useCases/startAttempt/StartAttemptUseCase";
import { AttemptMap } from "../../../mappers/AttemptMap";
import { mapFailure } from "./mapFailure";

export class StartAttemptController extends BaseController {
    constructor(private readonly useCase: StartAttemptUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const testSessionId = String(this.req.params.sessionId);
        const userId = this.req.authUser!.id!;

        const result = await this.useCase.execute(testSessionId, userId);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        const { attempt, questions, responses, resumed } = result.getValue();
        const body = {
            ...AttemptMap.toDTO(attempt),
            questions,
            responses: responses.map((r) => ({
                questionId: r.assessmentQuestionId,
                selectedOptionId: r.selectedOptionId,
                markedForReview: r.markedForReview,
            })),
            resumed,
        };
        if (resumed) this.ok(body);
        else this.created(body);
    }
}
