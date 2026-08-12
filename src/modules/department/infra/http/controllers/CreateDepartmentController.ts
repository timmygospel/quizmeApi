import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateDepartmentUseCase } from "../../../application/useCases/createDepartment/CreateDepartmentUseCase";
import { DepartmentMap } from "../../../mappers/DepartmentMap";

export class CreateDepartmentController extends BaseController {
    constructor(private readonly useCase: CreateDepartmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const name = this.req.body?.name;

            const result = await this.useCase.execute({ name });

            if (result.isFailure) {
                if (result.errorValue() === "DEPARTMENT_NAME_ALREADY_EXISTS") {
                    this.conflict("Department name already exists");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(DepartmentMap.toDTO(result.getValue()));
        } catch (error: any) {
            if (error?.message === "DEPARTMENT_NAME_ALREADY_EXISTS") {
                this.conflict("Department name already exists");
                return;
            }
            this.fail(error);
        }
    }
}
