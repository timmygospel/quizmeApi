import { BaseController } from "../../../../../shared/core/BaseController";
import { GetUserUseCase } from "../../../application/useCases/getUser/GetUserUseCase";
import { UserMap } from "../../../mappers/UserMap";

export class GetUserController extends BaseController {
    constructor(private readonly useCase: GetUserUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id, this.req.effectiveScope);

        if (result.isFailure) {
            this.notFound(result.errorValue());
            return;
        }

        this.ok(UserMap.toDTO(result.getValue()));
    }
}
