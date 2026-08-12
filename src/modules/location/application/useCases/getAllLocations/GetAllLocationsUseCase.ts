import { Result } from "../../../../../shared/core/Result";
import { ILocationRepository } from "../../../domain/ILocationRepository";
import { Location } from "../../../domain/Location";

export class GetAllLocationsUseCase {
    constructor(private repo: ILocationRepository) { }

    async execute(): Promise<Result<Location[]>> {
        try {
            const locations = await this.repo.findAll();
            return Result.ok(locations);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
