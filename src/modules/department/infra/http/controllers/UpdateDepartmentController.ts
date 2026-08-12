import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateDepartmentUseCase } from "../../../application/useCases/updateDepartment/UpdateDepartmentUseCase";
import { DepartmentMap } from "../../../mappers/DepartmentMap";

export class UpdateDepartmentController extends BaseController {
    constructor(private readonly useCase: UpdateDepartmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const id = this.req.params.id;
            const name = this.req.body?.name;

            const result = await this.useCase.execute({ id, name });

            if (result.isFailure) {
                if (result.errorValue() === "DEPARTMENT_NAME_ALREADY_EXISTS") {
                    this.conflict("Department name already exists");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(DepartmentMap.toDTO(result.getValue()));
            return;
        } catch (error: any) {
            if (error?.message === "DEPARTMENT_NAME_ALREADY_EXISTS") {
                this.conflict("Department name already exists");
                return;
            }
            this.fail(error);
            return;
        }
    }
}
