import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllCategoriesUseCase } from "../../../../application/useCases/getAllCategories/GetAllCategoriesUseCase";
import { Result } from "../../../../../shared/core/Result";
import { CategoryMap } from "../../../mappers/CategoryMap";
import { Category } from "../../../domain/Category";

export class GetAllCategoriesController extends BaseController {
    constructor(private useCase: GetAllCategoriesUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<Category[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            const dtos = result.getValue().map(CategoryMap.toDTO);
            return this.ok(dtos);
        } catch (err) {
            return this.fail(err);
        }
    }
}
