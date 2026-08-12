import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateSessionUseCase } from "../../../application/useCases/createSession/CreateSessionUseCase";
import { CreateSessionDTO } from "../../../application/useCases/createSession/CreateSessionDTO";
import { SessionMap } from "../../../mappers/SessionMap";

export class CreateSessionController extends BaseController {
    constructor(private readonly useCase: CreateSessionUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const dto: CreateSessionDTO = this.req.body;

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                this.clientError(result.errorValue());
                return;
            }

            this.ok(SessionMap.toDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
