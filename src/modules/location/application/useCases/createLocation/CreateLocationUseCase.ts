import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { ILocationRepository } from "../../../domain/ILocationRepository";
import { Location } from "../../../domain/Location";
import { LocationName } from "../../../domain/valueObjects/LocationName";
import { CreateLocationDTO } from "./CreateLocationDTO";

export class CreateLocationUseCase implements UseCase<CreateLocationDTO, Promise<Result<Location>>> {
    constructor(private repo: ILocationRepository) { }

    async execute(dto: CreateLocationDTO): Promise<Result<Location>> {
        try {
            const nameOrError = LocationName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            const location = new Location({ name: nameOrError.getValue() });

            const saved = await this.repo.save(location);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
