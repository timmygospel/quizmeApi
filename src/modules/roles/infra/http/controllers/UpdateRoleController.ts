import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateRoleUseCase } from "../../../application/useCases/updateRole/UpdateRoleUseCase";
import { RoleMap } from "../../../mappers/RoleMap";

export class UpdateRoleController extends BaseController {
    constructor(private readonly useCase: UpdateRoleUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const body = this.req.body ?? {};

        const result = await this.useCase.execute({
            id,
            name: body.name,
            description: body.description,
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
