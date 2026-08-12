import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllRolesUseCase } from "../../../application/useCases/getAllRoles/GetAllRolesUseCase";
import { Result } from "../../../../../shared/core/Result";
import { RoleMap } from "../../../mappers/RoleMap";
import { Role } from "../../../domain/Role";

export class GetAllRolesController extends BaseController {
    constructor(private useCase: GetAllRolesUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<Role[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            const dtos = result.getValue().map(RoleMap.toDTO);
            return this.ok(dtos);
        } catch (err) {
            return this.fail(err);
        }
    }
}
