import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateTestSessionUseCase } from "../../../application/useCases/createTestSession/CreateTestSessionUseCase";
import { CreateTestSessionDTO } from "../../../application/useCases/createTestSession/CreateTestSessionDTO";
import { TestSessionMap } from "../../../mappers/TestSessionMap";
import { mapFailure } from "./mapFailure";

export class CreateTestSessionController extends BaseController {
    constructor(private readonly useCase: CreateTestSessionUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const dto: CreateTestSessionDTO = this.req.body;
        const ownerId = this.req.authUser!.id!;

        const result = await this.useCase.execute(dto, ownerId, this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        this.created(TestSessionMap.toDTO(result.getValue()));
    }
}
