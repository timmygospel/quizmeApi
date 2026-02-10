import { BaseController } from "../../../../../shared/core/BaseController";
import { DeleteCategoryUseCase } from "../../../application/useCases/deleteCategory/DeleteCategoryUseCase";
import { Result } from "../../../../../shared/core/Result";

export class DeleteCategoryController extends BaseController {
    constructor(private useCase: DeleteCategoryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const id = this.req.params.id;

            const result: Result<void> = await this.useCase.execute({ id });

            if (result.isFailure) {
                return this.clientError(result.errorValue());
            }

            return this.ok({ message: "Category deleted successfully" });
        } catch (err) {
            return this.fail(err);
        }
    }
}
