import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllDepartmentsUseCase } from "../../../application/useCases/getAllDepartments/GetAllDepartmentsUseCase";
import { Result } from "../../../../../shared/core/Result";
import { DepartmentMap } from "../../../mappers/DepartmentMap";
import { Department } from "../../../domain/Department";

export class GetAllDepartmentsController extends BaseController {
    constructor(private useCase: GetAllDepartmentsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<Department[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            const dtos = result.getValue().map(DepartmentMap.toDTO);
            return this.ok(dtos);
        } catch (err) {
            return this.fail(err);
        }
    }
}
