import { BaseController } from "../../../../../shared/core/BaseController";
import { DeleteLocationUseCase } from "../../../application/useCases/deleteLocation/DeleteLocationUseCase";
import { Result } from "../../../../../shared/core/Result";

export class DeleteLocationController extends BaseController {
    constructor(private useCase: DeleteLocationUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const id = this.req.params.id;

            const result: Result<void> = await this.useCase.execute({ id });

            if (result.isFailure) {
                if (result.errorValue() === "LOCATION_IN_USE") {
                    return this.conflict(
                        "This location is still in use by users, roles or sessions, so it can't be deleted. You can still rename it."
                    );
                }
                return this.clientError(result.errorValue());
            }

            return this.ok({ message: "Location deleted successfully" });
        } catch (err) {
            return this.fail(err);
        }
    }
}
