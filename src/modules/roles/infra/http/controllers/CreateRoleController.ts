import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateRoleUseCase } from "../../../application/useCases/createRole/CreateRoleUseCase";
import { RoleMap } from "../../../mappers/RoleMap";

export class CreateRoleController extends BaseController {
    constructor(private readonly useCase: CreateRoleUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const body = this.req.body ?? {};

        const result = await this.useCase.execute({
            name: body.name,
            description: body.description,
            permissionCodes: body.permissionCodes,
        });

        if (result.isFailure) {
            const error = result.errorValue();

            if (error.startsWith("ROLE_CODE_ALREADY_EXISTS")) {
                const [, existingRoleId] = error.split(":");
                this.res.status(409).json({
                    message: "A role with this name already exists.",
                    existingRoleId,
                });
                return;
            }

            this.clientError(error);
            return;
        }

        this.created(RoleMap.toDTO(result.getValue()));
    }
}
