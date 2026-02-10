import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateCategoryUseCase } from "../../../application/useCases/updateCategory/UpdateCategoryUseCase";
import { CategoryMap } from "../../../mappers/CategoryMap";

export class UpdateCategoryController extends BaseController {
    constructor(private readonly useCase: UpdateCategoryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const id = this.req.params.id;
            const name = this.req.body?.name;

            const result = await this.useCase.execute({ id, name });

            if (result.isFailure) {
                if (result.errorValue() === "CATEGORY_NAME_ALREADY_EXISTS") {
                    this.conflict("Category name already exists");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(CategoryMap.toDTO(result.getValue()));
            return;
        } catch (error: any) {
            if (error?.message === "CATEGORY_NAME_ALREADY_EXISTS") {
                this.conflict("Category name already exists");
                return;
            }
            this.fail(error);
            return;
        }
    }
}