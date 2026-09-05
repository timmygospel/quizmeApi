import { BaseController } from "../../../../../shared/core/BaseController";
import { SaveResponseUseCase } from "../../../application/useCases/saveResponse/SaveResponseUseCase";
import { AttemptMap } from "../../../mappers/AttemptMap";
import { mapFailure } from "./mapFailure";

export class SaveResponseController extends BaseController {
    constructor(private readonly useCase: SaveResponseUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const attemptId = String(this.req.params.attemptId);
        const questionId = String(this.req.params.questionId);
        const userId = this.req.authUser!.id!;
        const selectedOptionId = String(this.req.body?.selectedOptionId ?? "");

        const result = await this.useCase.execute(attemptId, questionId, userId, selectedOptionId);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        this.ok(AttemptMap.responseToAckDTO(result.getValue()));
    }
}
