import { BaseController } from "../../../../../shared/core/BaseController";
import { DeleteDepartmentUseCase } from "../../../application/useCases/deleteDepartment/DeleteDepartmentUseCase";
import { Result } from "../../../../../shared/core/Result";

export class DeleteDepartmentController extends BaseController {
    constructor(private useCase: DeleteDepartmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const id = this.req.params.id;

            const result: Result<void> = await this.useCase.execute({ id });

            if (result.isFailure) {
                return this.clientError(result.errorValue());
            }

            return this.ok({ message: "Department deleted successfully" });
        } catch (err) {
            return this.fail(err);
        }
    }
}
