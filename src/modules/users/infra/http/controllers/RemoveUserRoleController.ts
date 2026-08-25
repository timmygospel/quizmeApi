import { BaseController } from "../../../../../shared/core/BaseController";
import { RemoveUserRoleUseCase } from "../../../application/useCases/removeUserRole/RemoveUserRoleUseCase";

export class RemoveUserRoleController extends BaseController {
    constructor(private readonly useCase: RemoveUserRoleUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const userId = String(this.req.params.id);
        const roleId = String(this.req.params.roleId);

        const result = await this.useCase.execute(userId, roleId, this.req.effectiveScope);

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "USER_NOT_FOUND") {
                this.notFound(`User with id ${userId} not found`);
                return;
            }

            if (error === "ROLE_NOT_ASSIGNED") {
                this.notFound("This user does not have that role assigned.");
                return;
            }

            if (error === "LAST_ACTIVE_ADMINISTRATOR") {
                this.conflict(
                    "This organisation must have at least one active Administrator. Assign another Administrator before removing this access."
                );
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(result.getValue());
    }
}
