import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateLocationUseCase } from "../../../application/useCases/updateLocation/UpdateLocationUseCase";
import { LocationMap } from "../../../mappers/LocationMap";

export class UpdateLocationController extends BaseController {
    constructor(private readonly useCase: UpdateLocationUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const id = this.req.params.id;
            const name = this.req.body?.name;

            const result = await this.useCase.execute({ id, name });

            if (result.isFailure) {
                if (result.errorValue() === "LOCATION_NAME_ALREADY_EXISTS") {
                    this.conflict("Location name already exists");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(LocationMap.toDTO(result.getValue()));
            return;
        } catch (error: any) {
            if (error?.message === "LOCATION_NAME_ALREADY_EXISTS") {
                this.conflict("Location name already exists");
                return;
            }
            this.fail(error);
            return;
        }
    }
}
