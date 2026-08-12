import { BaseController } from "../../../../../shared/core/BaseController";
import { GetSessionUseCase } from "../../../application/useCases/getSession/GetSessionUseCase";
import { SessionMap } from "../../../mappers/SessionMap";

export class GetSessionController extends BaseController {
    constructor(private readonly useCase: GetSessionUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const id = String(this.req.params.id);

            const result = await this.useCase.execute(id);

            if (result.isFailure) {
                this.notFound(result.errorValue());
                return;
            }

            this.ok(SessionMap.toDTO(result.getValue()));
        } catch (err) {
            this.fail(err);
        }
    }
}
