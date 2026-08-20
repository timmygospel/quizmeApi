import { BaseController } from "../../../../../shared/core/BaseController";
import { SetRolePermissionsUseCase } from "../../../application/useCases/setRolePermissions/SetRolePermissionsUseCase";
import { RoleMap } from "../../../mappers/RoleMap";

export class SetRolePermissionsController extends BaseController {
    constructor(private readonly useCase: SetRolePermissionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const body = this.req.body ?? {};

        const result = await this.useCase.execute({
            roleId: id,
            permissionCodes: body.permissionCodes,
        });

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "ROLE_NOT_FOUND") {
                this.notFound(`Role with id ${id} not found`);
                return;
            }

            if (error === "ROLE_ARCHIVED") {
                this.conflict("An archived role cannot be edited.");
                return;
            }

            this.clientError(error);
            return;
        }

        this.ok(RoleMap.toDTO(result.getValue()));
    }
}
