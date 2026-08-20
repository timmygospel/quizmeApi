import { BaseController } from "../../../../../shared/core/BaseController";
import { ArchiveUserUseCase } from "../../../application/useCases/archiveUser/ArchiveUserUseCase";
import { UserMap } from "../../../mappers/UserMap";

export class ArchiveUserController extends BaseController {
    constructor(private readonly useCase: ArchiveUserUseCase) {
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

            if (error === "LAST_ACTIVE_ADMINISTRATOR") {
                this.conflict(
                    "This organisation must have at least one active Administrator. Assign another Administrator before removing this access."
                );
                return;
            }

            if (error.startsWith("INVALID_STATUS_TRANSITION")) {
                this.conflict(`Cannot archive a user with status ${error.split(":")[1]}`);
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(UserMap.toDTO(result.getValue()));
    }
}
