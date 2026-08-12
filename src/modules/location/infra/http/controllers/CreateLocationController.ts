import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateLocationUseCase } from "../../../application/useCases/createLocation/CreateLocationUseCase";
import { LocationMap } from "../../../mappers/LocationMap";

export class CreateLocationController extends BaseController {
    constructor(private readonly useCase: CreateLocationUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const name = this.req.body?.name;

            const result = await this.useCase.execute({ name });

            if (result.isFailure) {
                if (result.errorValue() === "LOCATION_NAME_ALREADY_EXISTS") {
                    this.conflict("Location name already exists");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(LocationMap.toDTO(result.getValue()));
        } catch (error: any) {
            if (error?.message === "LOCATION_NAME_ALREADY_EXISTS") {
                this.conflict("Location name already exists");
                return;
            }
            this.fail(error);
        }
    }
}
