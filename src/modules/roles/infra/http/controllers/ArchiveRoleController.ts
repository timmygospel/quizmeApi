import { BaseController } from "../../../../../shared/core/BaseController";
import { ArchiveRoleUseCase } from "../../../application/useCases/archiveRole/ArchiveRoleUseCase";
import { RoleMap } from "../../../mappers/RoleMap";

export class ArchiveRoleController extends BaseController {
    constructor(private readonly useCase: ArchiveRoleUseCase) {
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

            if (error === "CANNOT_ARCHIVE_SYSTEM_ROLE") {
                this.conflict("System roles cannot be archived.");
                return;
            }

            if (error === "ROLE_ALREADY_ARCHIVED") {
                this.conflict("This role is already archived.");
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(RoleMap.toDTO(result.getValue()));
    }
}
