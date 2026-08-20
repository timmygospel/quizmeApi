import { BaseController } from "../../../../../shared/core/BaseController";
import { GetRolePermissionsUseCase } from "../../../application/useCases/getRolePermissions/GetRolePermissionsUseCase";

export class GetRolePermissionsController extends BaseController {
    constructor(private readonly useCase: GetRolePermissionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id);

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "ROLE_NOT_FOUND") {
                this.notFound(`Role with id ${id} not found`);
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(result.getValue());
    }
}
