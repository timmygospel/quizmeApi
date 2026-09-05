import { BaseController } from "../../../../../shared/core/BaseController";
import { GetMyTestSessionsUseCase } from "../../../application/useCases/getMyTestSessions/GetMyTestSessionsUseCase";
import { mapFailure } from "./mapFailure";

export class GetMyTestSessionsController extends BaseController {
    constructor(private readonly useCase: GetMyTestSessionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const userId = this.req.authUser!.id!;
        const result = await this.useCase.execute(userId);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue());
    }
}
