import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

import { ILocationRepository } from "../../../domain/ILocationRepository";
import { Location } from "../../../domain/Location";
import { LocationName } from "../../../domain/valueObjects/LocationName";
import { UpdateLocationDTO } from "./UpdateLocationDTO";

export class UpdateLocationUseCase
    implements UseCase<UpdateLocationDTO, Promise<Result<Location>>> {
    constructor(private repo: ILocationRepository) { }

    async execute(dto: UpdateLocationDTO): Promise<Result<Location>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) {
                return Result.fail<Location>(`Location with id ${dto.id} not found`);
            }

            const nameOrError = LocationName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail<Location>(nameOrError.errorValue());

            const updated = new Location(
                {
                    ...existing.props,
                    name: nameOrError.getValue(),
                },
                dto.id
            );

            const saved = await this.repo.save(updated);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail<Location>(err instanceof Error ? err.message : String(err));
        }
    }
}
