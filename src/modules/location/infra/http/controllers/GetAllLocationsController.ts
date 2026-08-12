import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllLocationsUseCase } from "../../../application/useCases/getAllLocations/GetAllLocationsUseCase";
import { Result } from "../../../../../shared/core/Result";
import { LocationMap } from "../../../mappers/LocationMap";
import { Location } from "../../../domain/Location";

export class GetAllLocationsController extends BaseController {
    constructor(private useCase: GetAllLocationsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<Location[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            const dtos = result.getValue().map(LocationMap.toDTO);
            return this.ok(dtos);
        } catch (err) {
            return this.fail(err);
        }
    }
}
