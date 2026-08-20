import { BaseController } from "../../../../../shared/core/BaseController";
import { ActivateUserUseCase } from "../../../application/useCases/activateUser/ActivateUserUseCase";
import { UserMap } from "../../../mappers/UserMap";

export class ActivateUserController extends BaseController {
    constructor(private readonly useCase: ActivateUserUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id);

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "USER_NOT_FOUND") {
                this.notFound(`User with id ${id} not found`);
                return;
            }

            if (error.startsWith("INVALID_STATUS_TRANSITION")) {
                this.conflict(`Cannot activate a user with status ${error.split(":")[1]}`);
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(UserMap.toDTO(result.getValue()));
    }
}
