import { BaseController } from "../../../../../shared/core/BaseController";
import { GetRoleUseCase } from "../../../application/useCases/getRole/GetRoleUseCase";
import { RoleMap } from "../../../mappers/RoleMap";

export class GetRoleController extends BaseController {
    constructor(private readonly useCase: GetRoleUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id);

        if (result.isFailure) {
            this.notFound(result.errorValue());
            return;
        }

        this.ok(RoleMap.toDTO(result.getValue()));
    }
}
