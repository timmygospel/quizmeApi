import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllPermissionsUseCase } from "../../../application/useCases/getAllPermissions/GetAllPermissionsUseCase";

export class GetAllPermissionsController extends BaseController {
    constructor(private readonly useCase: GetAllPermissionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.useCase.execute();

        if (result.isFailure) {
            this.fail(result.errorValue());
            return;
        }

        this.ok(result.getValue());
    }
}
