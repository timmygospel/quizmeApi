import { BaseController } from "../../../../../shared/core/BaseController";
import { AssignUserRoleUseCase } from "../../../application/useCases/assignUserRole/AssignUserRoleUseCase";

export class AssignUserRoleController extends BaseController {
    constructor(private readonly useCase: AssignUserRoleUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const userId = String(this.req.params.id);
        const body = this.req.body ?? {};

        const result = await this.useCase.execute(
            {
                userId,
                roleId: body.roleId,
                allLocations: body.allLocations,
                locationIds: body.locationIds,
                departmentIds: body.departmentIds,
            },
            this.req.effectiveScope
        );

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "USER_NOT_FOUND") {
                this.notFound(`User with id ${userId} not found`);
                return;
            }

            if (error === "ROLE_NOT_FOUND") {
                this.clientError("ROLE_NOT_FOUND");
                return;
            }

            if (error === "USER_ARCHIVED") {
                this.conflict("An archived user cannot receive new role assignments.");
                return;
            }

            if (error === "ROLE_ARCHIVED") {
                this.conflict("An archived role cannot be assigned.");
                return;
            }

            if (error === "ORG_WIDE_ROLE_CANNOT_BE_SCOPED") {
                this.clientError("Administrator and Executive are always organisation-wide and cannot be scoped.");
                return;
            }

            if (error === "SCOPE_REQUIRED") {
                this.clientError("Select at least one location or department, or All Locations.");
                return;
            }

            this.clientError(error);
            return;
        }

        this.ok(result.getValue());
    }
}
