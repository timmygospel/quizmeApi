import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateCategoryUseCase } from "../../../application/useCases/createCategory/CreateCategoryUseCase";
import { CreateCategoryDTO } from "../../../application/useCases/createCategory/createCategoryDTO";
import { CategoryMap } from "../../../mappers/CategoryMap";

export class CreateCategoryController extends BaseController {
    constructor(private readonly useCase: CreateCategoryUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const dto = this.req.body;

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                if (result.errorValue() === "CATEGORY_NAME_ALREADY_EXISTS") {
                    return this.conflict("Category name already exists");
                }
                return this.clientError(result.errorValue());
            }

            return this.ok(CategoryMap.toDTO(result.getValue()));
        } catch (error: any) {
            if (error?.message === "CATEGORY_NAME_ALREADY_EXISTS") {
                return this.conflict("Category name already exists");
            }
            return this.fail(error);
        }
    }
}
